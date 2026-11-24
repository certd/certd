import crypto, { X509Certificate } from "node:crypto";
import dns from "node:dns/promises";
import { createCustomResolver } from "@certd/acme-client";
import net from "node:net";
import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { logger } from "@certd/basic";
import { In, LessThan, MoreThan, Not, Repository } from "typeorm";
import type { AcmeIssuerBackend } from "../acme-issuer-backend.js";
import type { AcmeIssuedCertificateStore } from "../acme-issued-certificate-store.js";
import { getCsrDomains, matchAllowedDomains, normalizeDomains, verifyCertIssuedBy } from "../../cert/service/cert-utils.js";
import { AcmeAccountEntity, AcmeAuthzEntity, AcmeChallengeEntity, AcmeOrderEntity } from "../entity/acme-server.js";
import { AcmeProblem, base64urlDecode, decodeJws, jwkThumbprint, randomId, sha256Base64Url, verifyJwsSignature } from "../protocol/acme-jws.js";
import { fetchHttpChallenge } from "../protocol/acme-network.js";
import { isSameAcmeUrl } from "../protocol/acme-url.js";
import { acmeNonceStore } from "../protocol/acme-nonce.js";
import { runTransaction } from "../../db/db-transaction.js";

const ORDER_TTL = 7 * 24 * 3600 * 1000;
const PRIVATE_JWK_FIELDS = ["d", "p", "q", "dp", "dq", "qi", "oth"];

export function sanitizePublicJwk(jwk: any) {
  if (!jwk || typeof jwk !== "object") {
    throw new AcmeProblem("malformed", "JWK格式错误");
  }
  if (PRIVATE_JWK_FIELDS.some(field => jwk[field] != null)) {
    throw new AcmeProblem("malformed", "JWK不能包含私钥参数");
  }
  const fields = jwk.kty === "RSA" ? ["kty", "n", "e"] : jwk.kty === "EC" ? ["kty", "crv", "x", "y"] : jwk.kty === "OKP" ? ["kty", "crv", "x"] : null;
  if (!fields) {
    throw new AcmeProblem("badPublicKey", "不支持的JWK类型");
  }
  const result: any = {};
  for (const field of fields) {
    if (jwk[field] == null) {
      throw new AcmeProblem("malformed", `JWK缺少${field}`);
    }
    result[field] = jwk[field];
  }
  return result;
}

function consumeNonce(nonce: string) {
  if (!acmeNonceStore.consume(nonce)) {
    throw new AcmeProblem("badNonce", "nonce无效或已过期", 400);
  }
}

function toPemCsr(der: Buffer) {
  const body = der
    .toString("base64")
    .match(/.{1,64}/g)
    ?.join("\n");
  return `-----BEGIN CERTIFICATE REQUEST-----\n${body}\n-----END CERTIFICATE REQUEST-----\n`;
}

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class AcmeServerService {
  @Inject("acmeIssuerBackend")
  issuer: AcmeIssuerBackend;

  @Inject("acmeIssuedCertificateStore")
  certificateStore: AcmeIssuedCertificateStore;

  @InjectEntityModel(AcmeAccountEntity)
  accountRepository: Repository<AcmeAccountEntity>;

  @InjectEntityModel(AcmeOrderEntity)
  orderRepository: Repository<AcmeOrderEntity>;

  @InjectEntityModel(AcmeAuthzEntity)
  authzRepository: Repository<AcmeAuthzEntity>;

  @InjectEntityModel(AcmeChallengeEntity)
  challengeRepository: Repository<AcmeChallengeEntity>;

  prepareResponse(ctx: any) {
    ctx.set("Replay-Nonce", acmeNonceStore.create());
    ctx.set("Cache-Control", "no-store");
  }

  respondError(ctx: any, error: any) {
    this.prepareResponse(ctx);
    const problem = error instanceof AcmeProblem ? error : new AcmeProblem("serverInternal", error?.message || "服务器内部错误", 500);
    ctx.status = problem.status;
    ctx.type = "application/problem+json";
    ctx.body = {
      type: `urn:ietf:params:acme:error:${problem.type}`,
      detail: problem.message,
      status: problem.status,
    };
  }

  async directory(caId: number) {
    const ca = await this.issuer.getAcmeCa(caId);
    const base = await this.baseUrl(caId);
    return {
      newNonce: `${base}/new-nonce`,
      newAccount: `${base}/new-account`,
      newOrder: `${base}/new-order`,
      revokeCert: `${base}/revoke-cert`,
      keyChange: `${base}/key-change`,
      meta: {
        termsOfService: "",
        website: "",
        caaIdentities: [],
        externalAccountRequired: true,
        // Certd扩展元数据：仅用作客户端规划提示，实际授权仍由服务端执行
        certdLocalCa: {
          caId: ca.id,
          eabRequired: true,
          directIssue: ca.acmeDirectIssue === true,
        },
      },
    };
  }

  async newAccount(ctx: any, caId: number, body: any) {
    await this.issuer.getAcmeCa(caId);
    const jws = decodeJws(body);
    this.assertUrl(jws, ctx);
    if (!jws.header.jwk) {
      throw new AcmeProblem("malformed", "new-account必须使用jwk签名");
    }
    if (!verifyJwsSignature(jws, jws.header.jwk)) {
      throw new AcmeProblem("unauthorized", "JWS签名验证失败", 401);
    }
    consumeNonce(jws.header.nonce);
    const accountJwk = sanitizePublicJwk(jws.header.jwk);
    const thumbprint = jwkThumbprint(accountJwk);
    const payload = jws.payload || {};
    let account = await this.accountRepository.findOne({ where: { caId, thumbprint } });
    if (account) {
      // 旧账户已由迁移删除；运行时不再提供回绑，已有 eab_id 永久不可变
      if (!account.eabId) {
        throw new AcmeProblem("unauthorized", "该账户创建于EAB强制之前，已失效，请使用EAB重新注册", 401);
      }
      if (account.status !== "valid") {
        throw new AcmeProblem("unauthorized", "账户不可用", 401);
      }
      await this.assertAccountEabActive(account);
      await this.issuer.markBaseUrlLocked(caId);
      logger.info(`[acme] account reused ca=${caId} account=${account.id}`);
      ctx.status = 200;
      ctx.set("Location", `${await this.baseUrl(caId)}/account/${account.id}`);
    } else {
      if (payload.onlyReturnExisting === true) {
        throw new AcmeProblem("accountDoesNotExist", "账户不存在", 400);
      }
      const eab = await this.verifyExternalAccountBinding(caId, payload.externalAccountBinding, thumbprint);
      const manager = this.accountRepository.manager;
      if (!manager?.transaction) {
        throw new AcmeProblem("serverInternal", "账户事务不可用", 500);
      }
      account = this.accountRepository.create({
        id: randomId(),
        caId,
        userId: eab.userId || 0,
        projectId: eab.projectId,
        jwk: JSON.stringify(accountJwk),
        thumbprint,
        eabId: eab.id,
        status: "valid",
        contact: JSON.stringify(payload.contact || []),
      });
      await runTransaction(manager, async tx => {
        const consumed = await this.issuer.consumeAcmeEab(eab.id, tx);
        if (!consumed) {
          throw new AcmeProblem("unauthorized", "EAB凭证使用次数已耗尽", 401);
        }
        await tx.getRepository(AcmeAccountEntity).save(account);
      });
      await this.issuer.markBaseUrlLocked(caId);
      logger.info(`[acme] account created ca=${caId} account=${account.id} eab=${eab.id}`);
      ctx.status = 201;
      ctx.set("Location", `${await this.baseUrl(caId)}/account/${account.id}`);
    }
    return this.toAccount(account);
  }

  async getAccount(ctx: any, caId: number, body: any) {
    const { account } = await this.verifyAccount(ctx, caId, body);
    return this.toAccount(account);
  }

  async newOrder(ctx: any, caId: number, body: any) {
    const ca = await this.issuer.getAcmeCa(caId);
    const { jws, account } = await this.verifyAccount(ctx, caId, body);
    const payload = jws.payload || {};
    const identifiers = this.normalizeIdentifiers(payload.identifiers);
    const identifierValues = identifiers.map(item => item.value);
    matchAllowedDomains(identifierValues, this.parseAllowedDomains(ca.allowedDomains));
    if (account.eabId) {
      const profile = await this.issuer.getAcmeEabProfile(account.eabId);
      if (!profile) {
        throw new AcmeProblem("unauthorized", "EAB凭证已禁用或过期", 401);
      }
      matchAllowedDomains(identifierValues, profile.allowedDomains);
    }

    const acmeConfig = this.parseAcmeConfig(ca.acmeConfig);
    const base = await this.baseUrl(caId);
    const directIssue = ca.acmeDirectIssue === true && !!account.eabId;
    const manager = this.accountRepository.manager;
    if (!manager?.transaction) {
      throw new AcmeProblem("serverInternal", "订单事务不可用", 500);
    }
    const order = await runTransaction(manager, async tx => {
      const accountRepo = tx.getRepository(AcmeAccountEntity);
      const orderRepo = tx.getRepository(AcmeOrderEntity);
      const authzRepo = tx.getRepository(AcmeAuthzEntity);
      const challengeRepo = tx.getRepository(AcmeChallengeEntity);
      const driverType = String(tx.connection?.options?.type || "");
      if (!driverType.includes("sqlite")) {
        await accountRepo.findOne({ where: { id: account.id }, lock: { mode: "pessimistic_write" } });
      }

      const pendingCount = await orderRepo.count({
        where: { caId, accountId: account.id, status: In(["pending", "ready", "processing"]) },
      });
      if (pendingCount >= acmeConfig.maxPendingOrders) {
        throw new AcmeProblem("rateLimited", "该账户未完成订单过多，请稍后再试", 429);
      }
      const recentCount = await orderRepo.count({
        where: { caId, accountId: account.id, createTime: MoreThan(new Date(Date.now() - 60 * 1000)) },
      });
      if (recentCount >= acmeConfig.maxOrdersPerMinute) {
        throw new AcmeProblem("rateLimited", "订单创建过于频繁，请稍后再试", 429);
      }

      const orderId = randomId();
      const now = Date.now();
      const expiresTime = now + ORDER_TTL;
      const authzIds: string[] = [];

      for (const identifier of identifiers) {
        const wildcard = identifier.type === "dns" && identifier.value.startsWith("*.");
        const authzValue = wildcard ? identifier.value.slice(2) : identifier.value;
        const authz = authzRepo.create({
          id: randomId(),
          caId,
          orderId,
          accountId: account.id,
          identifierType: identifier.type,
          identifierValue: authzValue,
          wildcard,
          status: directIssue ? "valid" : "pending",
          expiresTime,
        });
        await authzRepo.save(authz);
        authzIds.push(authz.id);

        const challengeTypes = identifier.type === "ip" ? ["http-01"] : wildcard ? ["dns-01"] : ["dns-01", "http-01"];
        for (const type of challengeTypes) {
          const token = crypto.randomBytes(32).toString("base64url");
          const challenge = challengeRepo.create({
            id: randomId(),
            caId,
            orderId,
            authzId: authz.id,
            accountId: account.id,
            type,
            token,
            keyAuthorization: `${token}.${account.thumbprint}`,
            status: directIssue ? "valid" : "pending",
            validatedTime: directIssue ? now : null,
          });
          await challengeRepo.save(challenge);
        }
      }

      return await orderRepo.save(
        orderRepo.create({
          id: orderId,
          caId,
          accountId: account.id,
          status: directIssue ? "ready" : "pending",
          identifiers: JSON.stringify(identifiers),
          authzIds: JSON.stringify(authzIds),
          expiresTime,
          directIssue,
        })
      );
    });
    logger.info(`[acme] order created ca=${caId} account=${account.id} order=${order.id} identifiers=${identifiers.length} directIssue=${directIssue}`);
    ctx.status = 201;
    ctx.set("Location", `${base}/order/${order.id}`);
    return await this.toOrder(order);
  }

  async getOrder(ctx: any, caId: number, orderId: string, body: any) {
    const { account } = await this.verifyAccount(ctx, caId, body);
    const order = await this.getOrderForAccount(caId, orderId, account.id);
    this.assertNotExpired(order, "订单已过期");
    return await this.toOrder(order);
  }

  async getAuthorization(ctx: any, caId: number, authzId: string, body: any) {
    const { account } = await this.verifyAccount(ctx, caId, body);
    const authz = await this.authzRepository.findOne({ where: { id: authzId, caId } });
    if (!authz || authz.accountId !== account.id) {
      throw new AcmeProblem("unauthorized", "授权不存在", 401);
    }
    this.assertNotExpired(authz, "授权已过期");
    return await this.toAuthz(authz);
  }

  async postChallenge(ctx: any, caId: number, challengeId: string, body: any) {
    const { account } = await this.verifyAccount(ctx, caId, body);
    const challenge = await this.challengeRepository.findOne({ where: { id: challengeId, caId } });
    if (!challenge || challenge.accountId !== account.id) {
      throw new AcmeProblem("unauthorized", "挑战不存在", 401);
    }
    const jws = decodeJws(body);
    if (jws.payload !== null) {
      const authz = await this.authzRepository.findOne({ where: { id: challenge.authzId, caId } });
      if (!authz) {
        throw new AcmeProblem("serverInternal", "授权不存在", 500);
      }
      this.assertNotExpired(authz, "授权已过期");
      await this.triggerChallenge(caId, authz, challenge, jws.payload);
    }
    const latest = await this.challengeRepository.findOne({ where: { id: challenge.id } });
    logger.info(`[acme] challenge processed ca=${caId} authz=${challenge.authzId} type=${latest.type} status=${latest.status}`);
    return this.toChallenge(latest, await this.baseUrl(caId));
  }

  async finalizeOrder(ctx: any, caId: number, orderId: string, body: any) {
    const ca = await this.issuer.getAcmeCa(caId);
    const { account } = await this.verifyAccount(ctx, caId, body);
    const current = await this.getOrderForAccount(caId, orderId, account.id);
    this.assertNotExpired(current, "订单已过期");
    if (current.status === "valid") {
      return await this.toOrder(current);
    }
    if (current.status !== "ready") {
      throw new AcmeProblem("orderNotReady", current.status === "processing" ? "订单正在处理中" : "订单尚未就绪", 403);
    }
    const jws = decodeJws(body);
    const csrValue = jws.payload?.csr;
    if (typeof csrValue !== "string") {
      throw new AcmeProblem("badCSR", "缺少CSR");
    }
    let csrPem: string;
    let csrDomains: string[];
    try {
      csrPem = toPemCsr(base64urlDecode(csrValue));
      csrDomains = getCsrDomains(csrPem);
    } catch (e: any) {
      throw new AcmeProblem("badCSR", `CSR解析失败：${e.message}`);
    }
    const checkCsrDomains = (order: AcmeOrderEntity) => {
      const orderIdentifiers = JSON.parse(order.identifiers).map((item: any) => item.value);
      const expected = normalizeDomains(orderIdentifiers).sort();
      const actual = normalizeDomains(csrDomains).sort();
      if (JSON.stringify(expected) !== JSON.stringify(actual)) {
        throw new AcmeProblem("badCSR", "CSR域名与订单不一致");
      }
    };
    checkCsrDomains(current);

    const manager = this.orderRepository.manager;
    if (!manager?.transaction) {
      throw new AcmeProblem("serverInternal", "订单事务不可用", 500);
    }
    return await runTransaction(manager, async tx => {
      const orderRepository = tx.getRepository(AcmeOrderEntity);
      const order = await orderRepository.findOne({ where: { id: orderId, caId } });
      if (!order || order.accountId !== account.id) {
        throw new AcmeProblem("unauthorized", "订单不存在", 401);
      }
      this.assertNotExpired(order, "订单已过期");
      if (order.status === "valid") {
        return await this.toOrder(order);
      }
      if (order.status !== "ready") {
        throw new AcmeProblem("orderNotReady", "订单正在处理中或尚未就绪", 403);
      }
      checkCsrDomains(order);
      // 在事务内锁定并重新读取CA策略，确保关闭直签/收紧域名范围与签发串行化
      const freshCa = await this.issuer.getAcmeCaForUpdate(caId, tx);
      this.assertDirectIssueAllowed(order, freshCa);
      await this.assertOrderStillAuthorized(freshCa, account, order, tx);
      // 事务内读取最新ACME配置，避免订单创建后管理员调整有效期仍用旧值签发
      const freshConfig = this.parseAcmeConfig(freshCa.acmeConfig);

      // 条件更新认领订单，保证并发 finalize 只有一个能签发
      const claimed = await orderRepository.update({ id: orderId, caId, accountId: account.id, status: "ready" }, { status: "processing", updateTime: new Date() });
      if (!claimed.affected) {
        const latest = await orderRepository.findOne({ where: { id: orderId, caId } });
        if (latest?.status === "valid") {
          return await this.toOrder(latest);
        }
        throw new AcmeProblem("orderNotReady", "订单正在处理中或尚未就绪", 403);
      }

      let signed;
      try {
        signed = await this.issuer.signCsrForAcme(freshCa.id, csrPem, freshConfig.validityDays);
      } catch (e: any) {
        logger.warn(`[acme] finalize signing failed ca=${ca.id} order=${order.id} account=${account.id}: ${e?.message || e}`);
        throw new AcmeProblem("serverInternal", `证书签发失败：${e.message}`, 500);
      }
      order.status = "valid";
      order.csr = csrPem;
      order.certPem = signed.fullchainPem;
      order.serialNumber = signed.serialNumber;
      order.updateTime = new Date();
      await orderRepository.save(order);
      await this.certificateStore.saveIssuedCertificate(
        {
          caId: ca.id,
          serialNumber: signed.serialNumber,
          fullchainPem: signed.fullchainPem,
          userId: account.userId,
          projectId: account.projectId,
          domainsFallback: JSON.parse(order.identifiers).map((item: any) => item.value),
        },
        tx
      );
      logger.info(`[acme] certificate issued ca=${ca.id} order=${order.id} account=${account.id} serial=${signed.serialNumber}`);
      return await this.toOrder(order);
    });
  }

  async getCertificate(ctx: any, caId: number, orderId: string, body: any) {
    const { account } = await this.verifyAccount(ctx, caId, body);
    const order = await this.getOrderForAccount(caId, orderId, account.id);
    this.assertNotExpired(order, "订单已过期");
    if (order.status !== "valid" || !order.certPem) {
      throw new AcmeProblem("orderNotReady", "证书尚未签发", 403);
    }
    return order.certPem;
  }

  async revokeCertificate(ctx: any, caId: number, body: any) {
    let ca = await this.issuer.getCaForAcmeRevocation(caId);
    const jws = decodeJws(body);
    this.assertUrl(jws, ctx);
    let account: AcmeAccountEntity | null = null;
    if (jws.header.jwk) {
      if (!verifyJwsSignature(jws, jws.header.jwk)) {
        throw new AcmeProblem("unauthorized", "JWS签名验证失败", 401);
      }
    } else {
      account = await this.resolveAccount(jws, caId, { allowInactiveEab: true, allowDeactivated: true });
      if (!verifyJwsSignature(jws, JSON.parse(account.jwk))) {
        throw new AcmeProblem("unauthorized", "JWS签名验证失败", 401);
      }
    }
    consumeNonce(jws.header.nonce);
    const certValue = jws.payload?.certificate;
    if (typeof certValue !== "string") {
      throw new AcmeProblem("malformed", "缺少certificate");
    }
    let cert: X509Certificate;
    try {
      cert = new X509Certificate(base64urlDecode(certValue));
    } catch (e: any) {
      throw new AcmeProblem("malformed", `证书解析失败：${e.message}`);
    }
    if (jws.header.jwk) {
      this.assertJwkMatchesCertificate(jws.header.jwk, cert);
    }
    if (!verifyCertIssuedBy(cert.toString(), ca.certPem)) {
      // 轮换后新CA签发的证书仍可通过旧ACME端点吊销
      const effective = await this.issuer.getAcmeCa(caId).catch(() => null);
      if (effective?.certPem && verifyCertIssuedBy(cert.toString(), effective.certPem)) {
        ca = effective;
      } else {
        throw new AcmeProblem("unauthorized", "证书不是由该本地CA签发", 401);
      }
    }
    const serialNumber = cert.serialNumber.toUpperCase();
    if (account) {
      const order = await this.orderRepository.findOne({
        where: { caId, accountId: account.id, serialNumber },
      });
      if (!order) {
        throw new AcmeProblem("unauthorized", "无权吊销该证书", 401);
      }
    }
    const certInfo = await this.certificateStore.findIssuedCertificate(ca.id, serialNumber);
    if (certInfo) {
      await this.certificateStore.revokeIssuedCertificate({
        certInfoId: certInfo.id,
        caId: ca.id,
        userId: certInfo.userId,
        projectId: certInfo.projectId,
        serialNumber,
        expiresTime: certInfo.expiresTime,
      });
    } else {
      // 未绑定用户仓库的系统级证书只有ACME订单，没有cd_cert_info记录；仍需写入CRL
      await this.issuer.recordSystemCertRevocation({
        caId: ca.id,
        serialNumber,
        expiresTime: new Date(cert.validTo).getTime(),
        userId: account?.userId ?? 0,
        projectId: account?.projectId,
      });
    }
    ctx.status = 200;
  }

  private async verifyExternalAccountBinding(caId: number, eab: any, accountThumbprint: string) {
    if (!eab || typeof eab !== "object") {
      throw new AcmeProblem("externalAccountRequired", "该本地CA要求EAB认证，请在CA页面创建ACME凭证", 400);
    }
    if (typeof eab.protected !== "string" || typeof eab.payload !== "string" || typeof eab.signature !== "string") {
      throw new AcmeProblem("malformed", "externalAccountBinding格式错误");
    }
    let header: any;
    let jwk: any;
    try {
      header = JSON.parse(base64urlDecode(eab.protected).toString("utf8"));
      jwk = JSON.parse(base64urlDecode(eab.payload).toString("utf8"));
    } catch (e: any) {
      throw new AcmeProblem("malformed", `EAB解析失败：${e.message}`);
    }
    if (header.alg !== "HS256") {
      throw new AcmeProblem("badSignatureAlgorithm", "EAB仅支持HS256", 400);
    }
    if (!header.kid || typeof header.kid !== "string") {
      throw new AcmeProblem("malformed", "EAB缺少kid");
    }
    const expectedEabUrl = `${await this.baseUrl(caId)}/new-account`;
    if (!isSameAcmeUrl(header.url, expectedEabUrl)) {
      throw new AcmeProblem("malformed", "EAB url不匹配");
    }
    if (jwkThumbprint(jwk) !== accountThumbprint) {
      throw new AcmeProblem("malformed", "EAB绑定的账号公钥不匹配");
    }
    const info = await this.issuer.getAcmeEabSecret(caId, header.kid);
    if (!info || info.disabled) {
      throw new AcmeProblem("unauthorized", "EAB凭证不存在或已禁用", 401);
    }
    if (info.expiresTime && info.expiresTime <= Date.now()) {
      throw new AcmeProblem("unauthorized", "EAB凭证已过期", 401);
    }
    if (info.maxUses > 0 && info.usedCount >= info.maxUses) {
      throw new AcmeProblem("unauthorized", "EAB凭证使用次数已耗尽", 401);
    }
    const expected = crypto.createHmac("sha256", Buffer.from(info.hmacKey, "base64url")).update(`${eab.protected}.${eab.payload}`).digest();
    const actual = base64urlDecode(eab.signature);
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
      throw new AcmeProblem("unauthorized", "EAB签名验证失败", 401);
    }
    return info;
  }

  async listAccounts(caId: number, userId: number, projectId?: number) {
    await this.issuer.assertCaOwner({ id: caId, userId, projectId });
    const accounts = await this.accountRepository.find({ where: { caId }, order: { createTime: "DESC" } });
    const result = [];
    for (const account of accounts) {
      const orderCount = await this.orderRepository.count({ where: { caId, accountId: account.id } });
      const issuedCount = await this.orderRepository.count({ where: { caId, accountId: account.id, status: "valid" } });
      result.push({
        id: account.id,
        status: account.status,
        contact: account.contact ? JSON.parse(account.contact) : [],
        thumbprint: account.thumbprint,
        eabId: account.eabId,
        userId: account.userId,
        projectId: account.projectId,
        createTime: account.createTime,
        orderCount,
        issuedCount,
      });
    }
    return result;
  }

  async listAccountOrders(caId: number, accountId: string, userId: number, projectId?: number) {
    await this.issuer.assertCaOwner({ id: caId, userId, projectId });
    const account = await this.accountRepository.findOne({ where: { id: accountId, caId } });
    if (!account) {
      throw new AcmeProblem("unauthorized", "ACME账户不存在", 404);
    }
    const orders = await this.orderRepository.find({
      where: { caId, accountId },
      order: { createTime: "DESC" },
    });
    return orders.map(order => ({
      id: order.id,
      status: order.status,
      identifiers: JSON.parse(order.identifiers),
      serialNumber: order.serialNumber,
      directIssue: order.directIssue,
      error: order.error,
      createTime: order.createTime,
      expiresTime: order.expiresTime,
      certPem: order.certPem || null,
    }));
  }

  async setAccountStatus(caId: number, accountId: string, status: string, userId: number, projectId?: number) {
    await this.issuer.assertCaOwner({ id: caId, userId, projectId });
    if (!["valid", "deactivated"].includes(status)) {
      throw new AcmeProblem("malformed", "账户状态不合法");
    }
    const account = await this.accountRepository.findOne({ where: { id: accountId, caId } });
    if (!account) {
      throw new AcmeProblem("unauthorized", "ACME账户不存在", 404);
    }
    account.status = status;
    account.updateTime = new Date();
    await this.accountRepository.save(account);
  }

  async notImplemented() {
    throw new AcmeProblem("serverInternal", "暂不支持该ACME操作", 501);
  }

  private async verifyAccount(ctx: any, caId: number, body: any, consume = true) {
    await this.issuer.getAcmeCa(caId);
    const jws = decodeJws(body);
    this.assertUrl(jws, ctx);
    const account = await this.resolveAccount(jws, caId);
    if (!verifyJwsSignature(jws, JSON.parse(account.jwk))) {
      throw new AcmeProblem("unauthorized", "JWS签名验证失败", 401);
    }
    if (consume) {
      consumeNonce(jws.header.nonce);
    }
    return { jws, account };
  }

  private async assertAccountEabActive(account: AcmeAccountEntity, manager?: any) {
    if (!account.eabId) {
      throw new AcmeProblem("unauthorized", "账户未通过EAB认证，请重新注册", 401);
    }
    const profile = await this.issuer.getAcmeEabProfile(account.eabId, manager);
    if (!profile) {
      throw new AcmeProblem("unauthorized", "EAB凭证已禁用或过期", 401);
    }
    return profile;
  }

  private assertDirectIssueAllowed(order: AcmeOrderEntity, ca: any) {
    if (order.directIssue && ca.acmeDirectIssue !== true) {
      throw new AcmeProblem("unauthorized", "该订单依赖EAB直签，当前已关闭直签，无法签发", 403);
    }
  }

  private async assertOrderStillAuthorized(ca: any, account: AcmeAccountEntity, order: AcmeOrderEntity, manager?: any) {
    const domains = JSON.parse(order.identifiers).map((item: any) => item.value);
    matchAllowedDomains(domains, this.parseAllowedDomains(ca.allowedDomains));
    const profile = await this.assertAccountEabActive(account, manager);
    matchAllowedDomains(domains, profile.allowedDomains);
  }

  private async resolveAccount(jws: any, caId: number, options?: { allowInactiveEab?: boolean; allowDeactivated?: boolean }) {
    const kid = jws.header?.kid;
    if (typeof kid !== "string") {
      throw new AcmeProblem("malformed", "缺少kid");
    }
    let pathname: string;
    try {
      pathname = new URL(kid).pathname;
    } catch (e) {
      throw new AcmeProblem("malformed", "kid格式错误");
    }
    const parts = pathname.split("/").filter(Boolean);
    // kid 必须严格符合 .../api/acme/{caId}/account/{accountId}，允许前面存在反代路径前缀
    const length = parts.length;
    const validShape = length >= 5 && parts[length - 5] === "api" && parts[length - 4] === "acme" && parts[length - 2] === "account";
    const caIdText = validShape ? parts[length - 3] : "";
    const accountId = validShape ? parts[length - 1] : "";
    // Number() 会接受 0x66/1e2/+102 等格式，CA ID必须限定为正十进制整数
    if (!validShape || !/^[1-9]\d*$/.test(caIdText) || !/^[A-Za-z0-9_-]+$/.test(accountId)) {
      throw new AcmeProblem("malformed", "kid格式错误");
    }
    const kidCaId = Number(caIdText);
    // kid 必须指向当前请求所绑定的CA，避免账户kid在不同CA目录之间被混用
    if (kidCaId !== Number(caId)) {
      throw new AcmeProblem("unauthorized", "账户kid与当前CA不匹配", 401);
    }
    const account = await this.accountRepository.findOne({ where: { id: accountId, caId } });
    const statusAllowed = account?.status === "valid" || (options?.allowDeactivated === true && account?.status === "deactivated");
    if (!account || !statusAllowed) {
      throw new AcmeProblem("unauthorized", "账户不存在或不可用", 401);
    }
    // 吊销是安全兜底操作：即使EAB已禁用，也应允许账户吊销其历史订单证书
    if (options?.allowInactiveEab !== true) {
      await this.assertAccountEabActive(account);
    }
    return account;
  }

  private assertUrl(jws: any, ctx: any) {
    const url = jws.header?.url;
    if (typeof url !== "string") {
      throw new AcmeProblem("malformed", "JWS缺少url");
    }
    const expectedUrl = `${ctx.origin || `${ctx.protocol}://${ctx.host}`}${ctx.path}`;
    if (!isSameAcmeUrl(url, expectedUrl)) {
      throw new AcmeProblem("unauthorized", "JWS url与请求地址不匹配", 401);
    }
    if (!jws.header?.nonce) {
      throw new AcmeProblem("badNonce", "JWS缺少nonce", 400);
    }
  }

  private normalizeIdentifiers(input: any[]) {
    if (!Array.isArray(input) || input.length === 0) {
      throw new AcmeProblem("malformed", "identifiers不能为空");
    }
    if (input.length > 100) {
      throw new AcmeProblem("malformed", "单次订单最多支持100个域名");
    }
    const result: { type: string; value: string }[] = [];
    const seen = new Set<string>();
    for (const item of input) {
      const type = item?.type === "ip" ? "ip" : item?.type === "dns" ? "dns" : null;
      if (!type) {
        throw new AcmeProblem("rejectedIdentifier", `不支持的identifier类型：${item?.type}`);
      }
      const value = String(item?.value || "")
        .trim()
        .toLowerCase()
        .replace(/\.$/, "");
      if (!value) {
        throw new AcmeProblem("rejectedIdentifier", "identifier不能为空");
      }
      if (type === "ip" && !net.isIP(value)) {
        throw new AcmeProblem("rejectedIdentifier", `IP地址格式错误：${value}`);
      }
      if (type === "dns") {
        const hostname = value.startsWith("*.") ? value.slice(2) : value;
        if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(hostname)) {
          throw new AcmeProblem("rejectedIdentifier", `域名格式错误：${value}`);
        }
      }
      const key = `${type}:${value}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      result.push({ type, value });
    }
    return result;
  }

  private async triggerChallenge(caId: number, authz: AcmeAuthzEntity, challenge: AcmeChallengeEntity, payload: any) {
    this.assertNotExpired(authz, "授权已过期");
    const ca = await this.issuer.getAcmeCa(caId);
    if (challenge.status === "valid") {
      return;
    }
    challenge.status = "processing";
    challenge.updateTime = new Date();
    await this.challengeRepository.save(challenge);
    try {
      await this.performValidation(challenge, authz, ca.dnsServer);
      challenge.status = "valid";
      challenge.validatedTime = Date.now();
      authz.status = "valid";
    } catch (e: any) {
      challenge.status = "invalid";
      challenge.error = e.message;
      const siblings = await this.challengeRepository.find({ where: { authzId: authz.id } });
      if (siblings.filter(item => item.id !== challenge.id).every(item => item.status === "invalid")) {
        authz.status = "invalid";
      }
    }
    challenge.updateTime = new Date();
    authz.updateTime = new Date();
    await this.challengeRepository.save(challenge);
    await this.authzRepository.save(authz);
    await this.refreshOrderStatus(ca, authz.orderId);
  }

  private async performValidation(challenge: AcmeChallengeEntity, authz: AcmeAuthzEntity, dnsServer?: string | null) {
    if (challenge.type === "dns-01") {
      const expected = sha256Base64Url(challenge.keyAuthorization);
      let records: string[][];
      try {
        const resolver = dnsServer ? await createCustomResolver(String(dnsServer).split(/[,，\s]+/).filter(Boolean)) : dns;
        records = await resolver.resolveTxt(`_acme-challenge.${authz.identifierValue}`);
      } catch (e: any) {
        throw new Error(`DNS TXT查询失败（${e.code || e.message}）`);
      }
      const values = records.map(parts => parts.join(""));
      if (!values.includes(expected)) {
        throw new Error(`DNS TXT记录不匹配，期望值：${expected}`);
      }
      return;
    }
    if (challenge.type === "http-01") {
      await fetchHttpChallenge(authz.identifierValue, challenge.token, challenge.keyAuthorization);
      return;
    }
    throw new Error(`不支持的挑战类型：${challenge.type}`);
  }

  private async refreshOrderStatus(ca: any, orderId: string) {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      return;
    }
    // 终态订单不再根据授权状态回写，避免已签发(valid)订单被并发刷新成 ready，
    // 否则客户端会重复 finalize 或看到状态倒退。
    if (order.status === "valid" || order.status === "invalid") {
      return;
    }
    const authzIds = JSON.parse(order.authzIds);
    const authzs = await Promise.all(authzIds.map((id: string) => this.authzRepository.findOne({ where: { id } })));
    if (authzs.some(item => item?.status === "invalid")) {
      order.status = "invalid";
      order.error = "域名验证失败";
    } else if (authzs.every(item => item?.status === "valid")) {
      order.status = "ready";
    }
    order.updateTime = new Date();
    await this.orderRepository.save(order);
  }

  private assertNotExpired(entity: { expiresTime?: number }, message: string) {
    if (entity?.expiresTime && entity.expiresTime <= Date.now()) {
      throw new AcmeProblem("orderNotReady", message, 403);
    }
  }

  private async getOrderForAccount(caId: number, orderId: string, accountId: string) {
    const order = await this.orderRepository.findOne({ where: { id: orderId, caId } });
    if (!order || order.accountId !== accountId) {
      throw new AcmeProblem("unauthorized", "订单不存在", 401);
    }
    return order;
  }

  private async toOrder(order: AcmeOrderEntity) {
    const base = await this.baseUrl(order.caId);
    const authzIds = JSON.parse(order.authzIds);
    return {
      status: order.status,
      expires: new Date(Number(order.expiresTime)).toISOString(),
      identifiers: JSON.parse(order.identifiers),
      authorizations: authzIds.map((id: string) => `${base}/authz/${id}`),
      finalize: `${base}/finalize/${order.id}`,
      ...(order.certPem ? { certificate: `${base}/cert/${order.id}` } : {}),
    };
  }

  private async toAuthz(authz: AcmeAuthzEntity) {
    const challenges = await this.challengeRepository.find({
      where: { authzId: authz.id },
      order: { createTime: "ASC" },
    });
    const base = await this.baseUrl(authz.caId);
    return {
      status: authz.status,
      expires: new Date(Number(authz.expiresTime)).toISOString(),
      identifier: {
        type: authz.identifierType,
        value: authz.identifierValue,
      },
      ...(authz.wildcard ? { wildcard: true } : {}),
      challenges: challenges.map(challenge => this.toChallenge(challenge, base)),
    };
  }

  private toChallenge(challenge: AcmeChallengeEntity, base: string) {
    return {
      type: challenge.type,
      url: `${base}/challenge/${challenge.id}`,
      status: challenge.status,
      token: challenge.token,
      ...(challenge.validatedTime ? { validated: new Date(Number(challenge.validatedTime)).toISOString() } : {}),
      ...(challenge.error ? { error: { type: "urn:ietf:params:acme:error:unauthorized", detail: challenge.error } } : {}),
    };
  }

  private toAccount(account: AcmeAccountEntity) {
    return {
      status: account.status,
      contact: account.contact ? JSON.parse(account.contact) : [],
    };
  }


  private assertJwkMatchesCertificate(jwk: any, cert: X509Certificate) {
    const publicJwk = cert.publicKey.export({ format: "jwk" }) as any;
    if (jwk.kty === "RSA") {
      if (publicJwk.kty !== "RSA" || publicJwk.n !== jwk.n || publicJwk.e !== jwk.e) {
        throw new AcmeProblem("unauthorized", "JWS公钥与证书不匹配", 401);
      }
    } else if (jwk.kty === "EC") {
      if (publicJwk.kty !== "EC" || publicJwk.x !== jwk.x || publicJwk.y !== jwk.y) {
        throw new AcmeProblem("unauthorized", "JWS公钥与证书不匹配", 401);
      }
    } else {
      throw new AcmeProblem("unauthorized", "不支持的证书公钥类型", 401);
    }
  }

  private parseAllowedDomains(value?: string) {
    if (!value) {
      return [];
    }
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) {
        throw new Error("not an array");
      }
      return parsed;
    } catch (e) {
      throw new AcmeProblem("serverInternal", "allowedDomains配置损坏，已拒绝操作", 500);
    }
  }

  private parseAcmeConfig(value?: string) {
    if (!value) {
      return { validityDays: 90, maxPendingOrders: 20, maxOrdersPerMinute: 10 };
    }
    try {
      const parsed = JSON.parse(value);
      return {
        validityDays: parsed.validityDays || 90,
        maxPendingOrders: Math.max(1, Number(parsed.maxPendingOrders) || 20),
        maxOrdersPerMinute: Math.max(1, Number(parsed.maxOrdersPerMinute) || 10),
      };
    } catch (e) {
      return { validityDays: 90, maxPendingOrders: 20, maxOrdersPerMinute: 10 };
    }
  }

  async cleanupExpired() {
    const now = Date.now();
    const expired = await this.orderRepository.find({
      where: { expiresTime: LessThan(now), status: Not("valid") },
      select: { id: true },
    });
    const ids = expired.map(item => item.id);
    if (ids.length === 0) {
      return;
    }
    await this.challengeRepository.delete({ orderId: In(ids) });
    await this.authzRepository.delete({ orderId: In(ids) });
    await this.orderRepository.delete({ id: In(ids) });
  }

  private async baseUrl(caId: number) {
    const base = await this.issuer.getCaBaseUrl(caId);
    return `${base}/api/acme/${caId}`;
  }
}
