import crypto, { X509Certificate } from "node:crypto";
import dns from "node:dns/promises";
import net from "node:net";
import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { Repository } from "typeorm";
import { CertReader } from "@certd/plugin-lib";
import { LocalCaService } from "./local-ca-service.js";
import { getCsrDomains, matchAllowedDomains, normalizeDomains } from "./local-ca-crypto.js";
import { CertInfoService } from "../../monitor/service/cert-info-service.js";
import { CertInfoEntity, CertStatus } from "../../monitor/entity/cert-info.js";
import { AcmeAccountEntity, AcmeAuthzEntity, AcmeChallengeEntity, AcmeOrderEntity } from "../entity/acme-server.js";
import { AcmeProblem, base64urlDecode, decodeJws, jwkThumbprint, randomId, sha256Base64Url, verifyJwsSignature } from "./acme-jws.js";

const NONCE_TTL = 5 * 60 * 1000;
const ORDER_TTL = 7 * 24 * 3600 * 1000;
const nonces = new Map<string, number>();

function createNonce() {
  const now = Date.now();
  for (const [key, expires] of nonces) {
    if (expires <= now) {
      nonces.delete(key);
    }
  }
  const nonce = crypto.randomBytes(16).toString("base64url");
  nonces.set(nonce, now + NONCE_TTL);
  return nonce;
}

function consumeNonce(nonce: string) {
  const expires = nonces.get(nonce);
  if (!expires || expires <= Date.now()) {
    nonces.delete(nonce);
    throw new AcmeProblem("badNonce", "nonce无效或已过期", 400);
  }
  nonces.delete(nonce);
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
  @Inject()
  localCaService: LocalCaService;

  @Inject()
  certInfoService: CertInfoService;

  @InjectEntityModel(AcmeAccountEntity)
  accountRepository: Repository<AcmeAccountEntity>;

  @InjectEntityModel(AcmeOrderEntity)
  orderRepository: Repository<AcmeOrderEntity>;

  @InjectEntityModel(AcmeAuthzEntity)
  authzRepository: Repository<AcmeAuthzEntity>;

  @InjectEntityModel(AcmeChallengeEntity)
  challengeRepository: Repository<AcmeChallengeEntity>;

  prepareResponse(ctx: any) {
    ctx.set("Replay-Nonce", createNonce());
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
    await this.localCaService.getAcmeCa(caId);
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
        externalAccountRequired: false,
      },
    };
  }

  async newAccount(ctx: any, caId: number, body: any) {
    const ca = await this.localCaService.getAcmeCa(caId);
    const jws = decodeJws(body);
    this.assertUrl(jws, ctx);
    if (!jws.header.jwk) {
      throw new AcmeProblem("malformed", "new-account必须使用jwk签名");
    }
    if (!verifyJwsSignature(jws, jws.header.jwk)) {
      throw new AcmeProblem("unauthorized", "JWS签名验证失败", 401);
    }
    consumeNonce(jws.header.nonce);
    const thumbprint = jwkThumbprint(jws.header.jwk);
    const payload = jws.payload || {};
    let account = await this.accountRepository.findOne({ where: { caId, thumbprint } });
    if (account) {
      if (account.status !== "valid") {
        throw new AcmeProblem("unauthorized", "账户不可用", 401);
      }
      ctx.status = 200;
      ctx.set("Location", `${await this.baseUrl(caId)}/account/${account.id}`);
    } else {
      if (payload.onlyReturnExisting === true) {
        throw new AcmeProblem("accountDoesNotExist", "账户不存在", 400);
      }
      account = this.accountRepository.create({
        id: randomId(),
        caId,
        userId: ca.userId,
        projectId: ca.projectId,
        jwk: JSON.stringify(jws.header.jwk),
        thumbprint,
        status: "valid",
        contact: JSON.stringify(payload.contact || []),
      });
      await this.accountRepository.save(account);
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
    const ca = await this.localCaService.getAcmeCa(caId);
    const { jws, account } = await this.verifyAccount(ctx, caId, body);
    const payload = jws.payload || {};
    const identifiers = this.normalizeIdentifiers(payload.identifiers);
    matchAllowedDomains(
      identifiers.map(item => item.value),
      this.parseAllowedDomains(ca.allowedDomains)
    );

    const orderId = randomId();
    const now = Date.now();
    const expiresTime = now + ORDER_TTL;
    const authzIds: string[] = [];
    const base = await this.baseUrl(caId);

    for (const identifier of identifiers) {
      const wildcard = identifier.type === "dns" && identifier.value.startsWith("*.");
      const authzValue = wildcard ? identifier.value.slice(2) : identifier.value;
      const authz = this.authzRepository.create({
        id: randomId(),
        caId,
        orderId,
        accountId: account.id,
        identifierType: identifier.type,
        identifierValue: authzValue,
        wildcard,
        status: "pending",
        expiresTime,
      });
      await this.authzRepository.save(authz);
      authzIds.push(authz.id);

      const challengeTypes = ["dns-01"];
      if (!wildcard && identifier.type === "dns") {
        challengeTypes.push("http-01");
      }
      for (const type of challengeTypes) {
        const token = crypto.randomBytes(32).toString("base64url");
        const challenge = this.challengeRepository.create({
          id: randomId(),
          caId,
          orderId,
          authzId: authz.id,
          accountId: account.id,
          type,
          token,
          keyAuthorization: `${token}.${account.thumbprint}`,
          status: "pending",
        });
        await this.challengeRepository.save(challenge);
      }
    }

    const order = this.orderRepository.create({
      id: orderId,
      caId,
      accountId: account.id,
      status: "pending",
      identifiers: JSON.stringify(identifiers),
      authzIds: JSON.stringify(authzIds),
      expiresTime,
    });
    await this.orderRepository.save(order);
    ctx.status = 201;
    ctx.set("Location", `${base}/order/${order.id}`);
    return await this.toOrder(order);
  }

  async getOrder(ctx: any, caId: number, orderId: string, body: any) {
    const { account } = await this.verifyAccount(ctx, caId, body);
    const order = await this.getOrderForAccount(caId, orderId, account.id);
    return await this.toOrder(order);
  }

  async getAuthorization(ctx: any, caId: number, authzId: string, body: any) {
    const { account } = await this.verifyAccount(ctx, caId, body);
    const authz = await this.authzRepository.findOne({ where: { id: authzId, caId } });
    if (!authz || authz.accountId !== account.id) {
      throw new AcmeProblem("unauthorized", "授权不存在", 401);
    }
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
      await this.triggerChallenge(caId, authz, challenge, jws.payload);
    }
    const latest = await this.challengeRepository.findOne({ where: { id: challenge.id } });
    return this.toChallenge(latest, await this.baseUrl(caId));
  }

  async finalizeOrder(ctx: any, caId: number, orderId: string, body: any) {
    const ca = await this.localCaService.getAcmeCa(caId);
    const { account } = await this.verifyAccount(ctx, caId, body);
    const order = await this.getOrderForAccount(caId, orderId, account.id);
    if (order.status !== "ready") {
      throw new AcmeProblem("orderNotReady", "订单尚未就绪", 403);
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
    const orderIdentifiers = JSON.parse(order.identifiers).map((item: any) => item.value);
    const expected = normalizeDomains(orderIdentifiers).sort();
    const actual = normalizeDomains(csrDomains).sort();
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      throw new AcmeProblem("badCSR", "CSR域名与订单不一致");
    }

    const config = this.parseAcmeConfig(ca.acmeConfig);
    let signed;
    try {
      signed = await this.localCaService.signCsrForAcme(ca.id, csrPem, config.validityDays);
    } catch (e: any) {
      throw new AcmeProblem("serverInternal", `证书签发失败：${e.message}`, 500);
    }
    order.status = "valid";
    order.csr = csrPem;
    order.certPem = signed.fullchainPem;
    order.serialNumber = signed.serialNumber;
    order.updateTime = new Date();
    await this.orderRepository.save(order);
    await this.saveCertRecord(ca, order, signed);
    return await this.toOrder(order);
  }

  async getCertificate(ctx: any, caId: number, orderId: string, body: any) {
    const { account } = await this.verifyAccount(ctx, caId, body);
    const order = await this.getOrderForAccount(caId, orderId, account.id);
    if (order.status !== "valid" || !order.certPem) {
      throw new AcmeProblem("orderNotReady", "证书尚未签发", 403);
    }
    return order.certPem;
  }

  async revokeCertificate(ctx: any, caId: number, body: any) {
    const ca = await this.localCaService.getAcmeCa(caId);
    const jws = decodeJws(body);
    this.assertUrl(jws, ctx);
    let account: AcmeAccountEntity | null = null;
    if (jws.header.jwk) {
      if (!verifyJwsSignature(jws, jws.header.jwk)) {
        throw new AcmeProblem("unauthorized", "JWS签名验证失败", 401);
      }
    } else {
      account = await this.resolveAccount(jws, caId);
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
    const serialNumber = cert.serialNumber.toUpperCase();
    if (account) {
      const order = await this.orderRepository.findOne({
        where: { caId, accountId: account.id, serialNumber },
      });
      if (!order) {
        throw new AcmeProblem("unauthorized", "无权吊销该证书", 401);
      }
    }
    const certInfo = await this.certInfoService.findOne({
      where: { localCaId: ca.id, serialNumber },
    });
    if (!certInfo) {
      throw new AcmeProblem("malformed", "证书不是由该本地CA签发");
    }
    certInfo.status = CertStatus.revoked;
    certInfo.revokeTime = Date.now();
    await this.certInfoService.update(certInfo);
    ctx.status = 200;
  }

  async notImplemented() {
    throw new AcmeProblem("serverInternal", "暂不支持该ACME操作", 501);
  }

  private async verifyAccount(ctx: any, caId: number, body: any, consume = true) {
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

  private async resolveAccount(jws: any, caId: number) {
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
    const accountId = parts[parts.length - 1];
    if (!parts.includes("account") || !accountId) {
      throw new AcmeProblem("malformed", "kid格式错误");
    }
    const account = await this.accountRepository.findOne({ where: { id: accountId, caId } });
    if (!account || account.status !== "valid") {
      throw new AcmeProblem("unauthorized", "账户不存在或不可用", 401);
    }
    return account;
  }

  private assertUrl(jws: any, ctx: any) {
    const url = jws.header?.url;
    if (typeof url !== "string") {
      throw new AcmeProblem("malformed", "JWS缺少url");
    }
    let pathname: string;
    try {
      pathname = new URL(url).pathname;
    } catch (e) {
      throw new AcmeProblem("malformed", "JWS url格式错误");
    }
    if (pathname !== ctx.path) {
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
    const result: { type: string; value: string }[] = [];
    const seen = new Set<string>();
    for (const item of input) {
      const type = item?.type === "ip" ? "ip" : item?.type === "dns" ? "dns" : null;
      if (!type) {
        throw new AcmeProblem("rejectedIdentifier", `不支持的identifier类型：${item?.type}`);
      }
      let value = String(item?.value || "")
        .trim()
        .toLowerCase()
        .replace(/\.$/, "");
      if (!value) {
        throw new AcmeProblem("rejectedIdentifier", "identifier不能为空");
      }
      if (type === "ip" && !net.isIP(value)) {
        throw new AcmeProblem("rejectedIdentifier", `IP地址格式错误：${value}`);
      }
      if (type === "dns" && value.includes("*") && !value.startsWith("*.")) {
        throw new AcmeProblem("rejectedIdentifier", `域名格式错误：${value}`);
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
    const ca = await this.localCaService.getAcmeCa(caId);
    if (challenge.status === "valid") {
      return;
    }
    challenge.status = "processing";
    challenge.updateTime = new Date();
    await this.challengeRepository.save(challenge);
    try {
      await this.performValidation(challenge, authz);
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

  private async performValidation(challenge: AcmeChallengeEntity, authz: AcmeAuthzEntity) {
    if (challenge.type === "dns-01") {
      const expected = sha256Base64Url(challenge.keyAuthorization);
      const records = await dns.resolveTxt(`_acme-challenge.${authz.identifierValue}`);
      const values = records.map(parts => parts.join(""));
      if (!values.includes(expected)) {
        throw new Error(`DNS TXT记录不匹配，期望值：${expected}`);
      }
      return;
    }
    if (challenge.type === "http-01") {
      const url = `http://${authz.identifierValue}/.well-known/acme-challenge/${challenge.token}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000), redirect: "manual" });
      const text = (await res.text()).trim();
      if (res.status !== 200 || text !== challenge.keyAuthorization) {
        throw new Error(`HTTP-01校验失败，状态码：${res.status}`);
      }
      return;
    }
    throw new Error(`不支持的挑战类型：${challenge.type}`);
  }

  private async refreshOrderStatus(ca: any, orderId: string) {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
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
      expires: new Date(order.expiresTime).toISOString(),
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
      expires: new Date(authz.expiresTime).toISOString(),
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
      ...(challenge.validatedTime ? { validated: new Date(challenge.validatedTime).toISOString() } : {}),
      ...(challenge.error ? { error: { type: "urn:ietf:params:acme:error:unauthorized", detail: challenge.error } } : {}),
    };
  }

  private toAccount(account: AcmeAccountEntity) {
    return {
      status: account.status,
      contact: account.contact ? JSON.parse(account.contact) : [],
    };
  }

  private async saveCertRecord(ca: any, order: AcmeOrderEntity, signed: any) {
    const reader = new CertReader({ crt: signed.fullchainPem, key: "" });
    const orderDomains = JSON.parse(order.identifiers).map((item: any) => item.value);
    const domains = reader.detail.domains.altNames?.length ? reader.detail.domains.altNames : orderDomains;
    const bean = new CertInfoEntity();
    bean.userId = ca.userId;
    bean.projectId = ca.projectId;
    bean.domain = domains[0] || "";
    bean.domains = domains.join(",");
    bean.domainCount = domains.length;
    bean.wildcardDomainCount = domains.filter(item => item.startsWith("*.")).length;
    bean.applyTime = Date.now();
    bean.fromType = "acme";
    bean.certProvider = reader.detail.issuer.commonName;
    bean.effectiveTime = reader.effective;
    bean.expiresTime = reader.expires;
    bean.certInfo = JSON.stringify({ crt: signed.fullchainPem, key: "" });
    bean.localCaId = ca.id;
    bean.serialNumber = signed.serialNumber;
    bean.status = CertStatus.active;
    await this.certInfoService.add(bean);
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
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  private parseAcmeConfig(value?: string) {
    if (!value) {
      return { validityDays: 90 };
    }
    try {
      const parsed = JSON.parse(value);
      return { validityDays: parsed.validityDays || 90 };
    } catch (e) {
      return { validityDays: 90 };
    }
  }

  private async baseUrl(caId: number) {
    const base = await this.localCaService.getCaBaseUrl(caId);
    return `${base}/api/acme/${caId}`;
  }
}
