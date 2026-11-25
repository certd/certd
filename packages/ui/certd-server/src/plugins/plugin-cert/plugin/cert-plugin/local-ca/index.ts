import crypto from "node:crypto";
import { IsTaskPlugin, pluginGroups, RunStrategy, TaskInput, TaskOutput } from "@certd/pipeline";
import { CertReader } from "@certd/plugin-lib";
import type { CustomAcmeProvider } from "@certd/lib-server";
import { CertApplyPlugin } from "../apply.js";
import { CertApplyBaseConvertPlugin } from "../base-convert.js";
import type { CertInfo } from "../acme.js";
import type { EabAccess } from "../../../access/index.js";
import type { LocalCaGetter } from "../../../../../modules/local-ca/service/local-ca-getter.js";
import type { LocalCaSignerGetter } from "../../../../../modules/local-ca/service/local-ca-signer-getter.js";
import { filterAllowedDomains, verifyCertIssuedBy, type LocalCaKeyType } from "../../../../../modules/local-ca/service/local-ca-crypto.js";
import { parseLocalCaDirectory } from "../../../../../modules/local-ca/service/local-ca-directory.js";
import { isSameAcmeUrl } from "../../../../../modules/acme-server/protocol/acme-url.js";
import * as acme from "@certd/acme-client";

export type LocalCaApplyMode = "local-direct" | "local-acme";

type LocalCaSubscribeInfo = {
  id: number;
  name: string;
  caType: string;
  disabled: boolean;
  revoked?: boolean;
  notAfter?: number;
  acmeEnabled?: boolean;
  allowedDomains?: string | null;
  effectiveBaseUrl?: string;
  certPem?: string;
  dnsServer?: string | null;
};


const ACME_MODES: LocalCaApplyMode[] = ["local-acme"];

@IsTaskPlugin({
  name: "CertApplyLocalCa",
  icon: "ph:seal-check",
  title: "本地CA证书申请",
  group: pluginGroups.cert.key,
  serviceCapabilities: ["localCaGetter", "localCaSignerGetter"],
  desc: "支持本地CA直接签发与本地ACME两种模式；客户端需信任对应根CA，建议用于内部/测试环境。远程ACME请用通用证书申请任务+管理员配置的自定义颁发机构",
  default: {
    strategy: {
      runStrategy: RunStrategy.AlwaysRun,
    },
  },
  i18n: {
    "en-US": {
      title: "Request Certificate (Local CA)",
      desc: "Issue certificates through local direct signing or local ACME. Clients must trust the corresponding root CA. For remote ACME use the generic CertApply task with an admin-configured custom provider.",
      input: {
        mode: {
          title: "Issuance Mode",
          optionsMapping: {
            "local-direct": "Local Direct Signing",
            "local-acme": "Local ACME",
          },
          helper: "Local direct signing skips ACME/domain validation. Local ACME follows the ACME protocol and can skip validation only when the EAB is privileged.",
        },
        caId: { title: "CA", helper: "Local direct signing requires an intermediate CA. Local ACME requires ACME to be enabled on that CA." },
        keyType: { title: "Key Type" },
        validityDays: { title: "Validity (Days)", helper: "Capped by the CA's remaining validity." },
        renewDays: { title: "Renew Before (Days)", helper: "Reissue when the current certificate expires within this window." },
        privateKeyType: { title: "Key Algorithm" },
      },
    },
  },
})
export class CertApplyLocalCa extends CertApplyPlugin {
  @TaskInput({
    title: "签发方式",
    value: "local-direct",
    component: {
      name: "a-select",
      vModel: "value",
      options: [
        { value: "local-direct", label: "本地CA直接签发" },
        { value: "local-acme", label: "本地ACME服务" },
      ],
    },
    required: true,
    order: -10000,
    helper: "直接签发不经过ACME和域名校验；本地ACME走标准协议，仅当EAB为特权凭证时可跳过域名校验。远程ACME请改用通用证书申请任务",
  })
  mode: LocalCaApplyMode = "local-direct";

  @TaskInput({
    title: "证书域名",
    component: {
      name: "domain-selector",
      vModel: "value",
      mode: "tags",
      placeholder: "请输入证书域名/IP，比如：foo.com , *.foo.com , *.sub.foo.com , *.bar.com , 123.123.123.123",
      tokenSeparators: [",", " ", "，", "、", "|"],
      search: true,
      pager: true,
    },
    mergeScript: `return {
      component: {
        caId: ctx.compute(({ form }) => form.caId)
      }
    }`,
    rules: [{ type: "domains" }],
    required: true,
    col: {
      span: 24,
    },
    order: -999,
    helper:
      "1、支持多个域名打到一个证书上，例如： foo.com，*.foo.com，*.bar.com\n" +
      "2、子域名被通配符包含的不要填写，例如：www.foo.com已经被*.foo.com包含，不要填写www.foo.com\n" +
      "3、泛域名只能通配*号那一级（*.foo.com的证书不能用于foo.com且不能用于xxx.yyy.foo.com）\n" +
      "4、输入一个，空格之后，再输入下一个 \n" +
      "5、如果设置了子域托管解析（比如免费的二级域名托管在CF或者阿里云），请先[设置托管子域名](#/certd/pipeline/subDomain)",
  })
  domains: string[] = [];

  @TaskInput({
    title: "证书加密密码",
    component: {
      name: "input-password",
      vModel: "value",
    },
    required: false,
    order: 100,
    helper: "转换成PFX、jks格式证书是否需要加密\n不传则pfx格式默认空密码，jks格式默认123456",
  })
  pfxPassword = "";

  @TaskInput({
    title: "PFX证书转换参数",
    value: "-macalg SHA1 -keypbe PBE-SHA1-3DES -certpbe PBE-SHA1-3DES",
    component: {
      name: "a-auto-complete",
      vModel: "value",
      options: [
        { value: "", label: "兼容 Windows Server 最新" },
        { value: "-macalg SHA1 -keypbe PBE-SHA1-3DES -certpbe PBE-SHA1-3DES", label: "兼容 Windows Server 2016" },
        { value: "-nomac -keypbe PBE-SHA1-3DES -certpbe PBE-SHA1-3DES", label: "兼容 Windows Server 2008" },
      ],
    },
    required: false,
    order: 100,
    maybeNeed: true,
    helper: "兼容Windows Server各个版本",
  })
  pfxArgs = "-macalg SHA1 -keypbe PBE-SHA1-3DES -certpbe PBE-SHA1-3DES";

  @TaskOutput({
    title: "域名证书",
    type: "cert",
  })
  cert?: CertInfo = undefined;

  @TaskInput({
    title: "中间CA",
    helper: "本地直签必选中间CA；本地ACME可留空（自动使用ACME账号绑定的CA）；客户端需要信任其根CA",
    component: {
      name: "local-ca-selector",
      vModel: "modelValue",
    },
    required: false,
    order: -9990,
  })
  caId!: number;

  @TaskInput({
    title: "密钥类型",
    value: "rsa2048",
    component: {
      name: "a-select",
      vModel: "value",
      options: [
        { value: "rsa2048", label: "RSA 2048" },
        { value: "rsa3072", label: "RSA 3072" },
        { value: "rsa4096", label: "RSA 4096" },
        { value: "ecdsa256", label: "ECDSA P-256" },
        { value: "ecdsa384", label: "ECDSA P-384" },
      ],
    },
    required: true,
    order: 90,
  })
  keyType: LocalCaKeyType = "rsa2048";

  @TaskInput({
    title: "证书有效期(天)",
    value: 365,
    helper: "实际有效期不会超过CA证书的剩余有效期",
    component: {
      name: "a-input-number",
      vModel: "value",
      min: 1,
      max: 3650,
    },
    required: true,
    order: 91,
  })
  validityDays = 365;

  private localCa?: LocalCaSubscribeInfo;
  private resolvedDirectoryUrl?: string;
  private directCertMeta?: { localCaId: number; serialNumber: string };
  private directIssueCache?: boolean;

  /** 本地ACME：caId由所选颁发机构(local-ca-N)推导，兼容旧任务从账号Directory URL推导，避免双选冲突。 */
  private async ensureLocalAcmeCaId() {
    if (this.mode !== "local-acme") {
      return;
    }
    if (this.sslProvider && String(this.sslProvider).startsWith("local-ca-")) {
      try {
        const service: any = await this.ctx.serviceGetter.get("customAcmeProviderService");
        const provider = await service?.getBySslProvider?.(this.sslProvider);
        const caId = provider?.localCaId ?? parseLocalCaDirectory(provider?.directoryUrl)?.caId;
        if (caId) {
          this.caId = Number(caId);
          return;
        }
      } catch {
        // 落到账号推导
      }
    }
    if (!this.caId && this.acmeAccountAccessId) {
      try {
        const access: any = await this.getAccess(this.acmeAccountAccessId);
        const account = this.parseAcmeAccount(access.account);
        const caId = parseLocalCaDirectory(account.directoryUrl)?.caId;
        if (caId) {
          this.caId = caId;
        }
      } catch {
        // 忽略，后续prepareLocalCa会给出明确错误
      }
    }
  }

  /** 本地ACME颁发机构下拉：仅列已同步(localCaId)、启用、且当前用户有权使用的中间CA。 */
  async onSslProviderList() {
    const service: any = await this.ctx.serviceGetter.get("customAcmeProviderService");
    const providers = (await service?.getAll?.()) || [];
    const getter: any = await this.ctx.serviceGetter.get("localCaGetter");
    const usable = (await getter?.listOptions?.()) || [];
    const usableIds = new Set(usable.map((item: any) => Number(item.id)));
    return providers
      .filter((provider: any) => provider.localCaId != null && provider.enabled !== false && usableIds.has(Number(provider.localCaId)))
      .map((provider: any) => ({
        value: provider.sslProvider,
        label: `${provider.title} 【local-ca-${provider.localCaId}】【中间CA】`,
      }));
  }

  async onInit() {
    if (!this.mode) {
      this.mode = "local-direct";
    }
    if ((this.mode as string) === "remote-acme") {
      throw new Error("远程ACME模式已移除：请改用通用『证书申请(CertApply)』任务，由管理员在系统设置-流水线设置中配置自定义ACME颁发机构");
    }
    if (this.mode === "local-acme") {
      await this.ensureLocalAcmeCaId();
      await this.prepareLocalCa(true);
    }
  }

  getCheckChangeInputKeys(): string[] {
    // 仅纳入任务输入中稳定存在的字段，避免插件默认空字符串(pfxPassword/directoryUrl)
    // 与任务输入缺失字段不一致导致每次运行都误判参数变化而重签。
    return ["domains", "mode", "caId", "keyType", "validityDays"];
  }

  async condition() {
    // 直接签发在判断是否续期前先校验CA状态与域名范围，禁用/过期的CA不能继续输出旧证书。
    // 这里只校验、不修改domains，避免改变输入哈希导致每次运行都被判定为参数变化而重签。
    if (this.mode === "local-direct") {
      const ca = await this.prepareLocalCa(false);
      const domains = (this.domains || []).filter(Boolean);
      if (domains.length === 0) {
        throw new Error("请填写证书域名");
      }
      const allowedList = filterAllowedDomains(domains, this.parseCaAllowedDomains(ca));
      if (allowedList.length === 0) {
        throw new Error(`所有域名都不在CA允许签发范围内：${domains.join(",")}`);
      }
    }
    return await super.condition();
  }

  async doCertApply(): Promise<CertReader> {
    if (this.mode === "local-direct") {
      return await this.doLocalDirect();
    }
    await this.ensureLocalAcmeCaId();
    const directoryUrl = await this.getResolvedDirectoryUrl();
    this.sslProvider = this.buildSslProvider(directoryUrl) as any;
    if (!this.challengeType) {
      this.challengeType = "auto";
    }
    if (this.acmeAccountAccessId) {
      const access: any = await this.getAccess(this.acmeAccountAccessId);
      const account = this.parseAcmeAccount(access.account);
      if (!isSameAcmeUrl(account.directoryUrl, directoryUrl)) {
        // 轮换无感：账号绑定旧CA目录，当前CA为其轮换后继时视为一致（服务端ACME自动重定向）
        const accountCaId = parseLocalCaDirectory(account.directoryUrl)?.caId;
        const currentCaId = parseLocalCaDirectory(directoryUrl)?.caId;
        let rotatedMatch = false;
        if (accountCaId && currentCaId && this.mode === "local-acme") {
          const getter: any = await this.ctx.serviceGetter.get("localCaGetter");
          const effective = await getter?.getCa?.(accountCaId);
          rotatedMatch = Number(effective?.id) === Number(currentCaId);
        }
        if (!rotatedMatch) {
          throw new Error(`ACME账号绑定的Directory URL与当前CA不一致，请重新生成ACME账号（账号：${account.directoryUrl || "-"}，当前：${directoryUrl}）`);
        }
      }
    }
    if (this.mode === "local-acme") {
      const ca = await this.prepareLocalCa(true);
      const domains = (this.domains || []).filter(Boolean);
      const allowedList = filterAllowedDomains(domains, this.parseCaAllowedDomains(ca));
      const skipped = domains.filter(item => !allowedList.includes(item));
      if (allowedList.length === 0) {
        throw new Error(`所有域名都不在CA允许签发范围内：${domains.join(",")}`);
      }
      if (skipped.length > 0) {
        this.logger.warn(`以下域名不在CA允许范围内，已跳过：${skipped.join(",")}`);
      }
      this.domains = allowedList;
    }
    return await super.doCertApply();
  }

  async emitCertApplySuccess() {
    // 由插件明确附加签发来源，通用基类不感知Local CA；本地模式关联失败必须报错，不能静默降级
    const issuer = await this.resolveIssuer();
    return await CertApplyBaseConvertPlugin.prototype.emitCertApplySuccess.call(this, issuer ? { extensions: { issuer } } : undefined);
  }

  private async resolveIssuer(): Promise<{ type: string; id: string; serialNumber?: string } | null> {
    if (!this.cert?.crt) {
      return null;
    }
    const serialNumber = new crypto.X509Certificate(this.cert.crt).serialNumber.toUpperCase();
    if (this.mode === "local-direct") {
      if (!this.directCertMeta) {
        throw new Error("本地CA直签缺少证书来源信息，拒绝写入证书仓库");
      }
      return { type: "local-ca", id: String(this.directCertMeta.localCaId), serialNumber: this.directCertMeta.serialNumber };
    }
    if (this.mode === "local-acme") {
      const ca = await this.prepareLocalCa(true);
      if (!verifyCertIssuedBy(this.cert.crt, ca.certPem)) {
        throw new Error("本地ACME证书与所选CA不匹配，拒绝写入证书仓库");
      }
      return { type: "local-ca", id: String(ca.id), serialNumber };
    }
    return null;
  }

  protected async getAcmeProvider(): Promise<CustomAcmeProvider> {
    const directoryUrl = await this.getResolvedDirectoryUrl();
    this.sslProvider = this.buildSslProvider(directoryUrl) as any;
    return {
      title: "本地ACME",
      sslProvider: "custom",
      directoryUrl,
      builtIn: false,
      needEAB: true,
      reverseProxy: this.reverseProxy || "",
    } as any;
  }

  protected async resolveDnsServers(): Promise<string[] | undefined> {
    if (this.mode !== "local-acme") return undefined;
    const ca = await this.prepareLocalCa(true);
    const servers = String(ca.dnsServer || "").split(/[,，\s]+/).map(item => item.trim()).filter(Boolean);
    return servers.length ? servers : undefined;
  }

  protected async resolveCustomAcmeEab(): Promise<EabAccess | null | undefined> {
    // EAB凭证统一复用ACME账号授权，不在任务内明文填写
    return undefined;
  }

  protected requiresAcmeAccount(): boolean {
    return true;
  }

  protected async createDomainsVerifyPlanByAuto(domains: string[], acmeAccount?: any) {
    if (this.mode === "local-direct") {
      return {};
    }
    const directIssue = await this.isDirectIssueMode(acmeAccount);
    if (directIssue) {
      this.logger.info(`ACME服务已开启EAB直签，自动匹配忽略域名校验计划`);
      return {};
    }
    return await super.createDomainsVerifyPlanByAuto(domains, acmeAccount);
  }




  private async doLocalDirect(): Promise<CertReader> {
    const ca = await this.prepareLocalCa(false);
    const domains = (this.domains || []).filter(Boolean);
    if (domains.length === 0) {
      throw new Error("请填写证书域名");
    }
    const allowedList = filterAllowedDomains(domains, this.parseCaAllowedDomains(ca));
    const skipped = domains.filter(item => !allowedList.includes(item));
    if (allowedList.length === 0) {
      throw new Error(`所有域名都不在CA允许签发范围内：${domains.join(",")}`);
    }
    if (skipped.length > 0) {
      this.logger.warn(`以下域名不在CA允许范围内，已跳过：${skipped.join(",")}`);
    }
    this.domains = allowedList;

    this.checkSignal();
    const signer = await this.ctx.serviceGetter.get<LocalCaSignerGetter>("localCaSignerGetter");
    if (!signer) {
      throw new Error("当前环境不支持本地CA直接签发，请确认已启用本地CA模块");
    }
    const result = await signer.issueLeaf({
      caId: ca.id,
      domains: this.domains,
      keyType: this.keyType,
      validityDays: Math.max(1, Number(this.validityDays || 365)),
    });
    this.directCertMeta = { localCaId: ca.id, serialNumber: result.serialNumber };
    this.registerSecret(result.key);
    this.logger.info(`本地CA证书签发成功，序列号：${result.serialNumber}`);
    return new CertReader({ crt: result.crt, key: result.key });
  }

  private async prepareLocalCa(requireAcme: boolean): Promise<LocalCaSubscribeInfo> {
    if (!this.caId) {
      throw new Error("请选择本地CA");
    }
    if (this.localCa) {
      return this.localCa;
    }
    const getter = await this.ctx.serviceGetter.get<LocalCaGetter>("localCaGetter");
    if (!getter) {
      throw new Error("当前环境不支持本地CA，请确认已启用本地CA模块");
    }
    const ca = await getter.getCa(this.caId);
    if (!ca) {
      throw new Error("本地CA不存在或无访问权限");
    }
    if (ca.caType !== "intermediate") {
      throw new Error("根CA不能直接签发叶子证书，请选择中间CA");
    }
    if (ca.disabled) {
      throw new Error("本地CA已禁用");
    }
    if (ca.revoked) {
      throw new Error("本地CA已被父CA吊销，不能签发");
    }
    if (ca.notAfter && ca.notAfter < Date.now()) {
      throw new Error("本地CA已过期，不能签发");
    }
    if (requireAcme && !ca.acmeEnabled) {
      throw new Error("该本地CA未启用ACME服务");
    }
    this.localCa = ca as LocalCaSubscribeInfo;
    return this.localCa;
  }

  private parseCaAllowedDomains(ca: LocalCaSubscribeInfo): string[] {
    try {
      const parsed = ca.allowedDomains ? JSON.parse(ca.allowedDomains) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * ACME账号缓存按sslProvider隔离；不同CA/远程目录必须使用独立命名空间，避免复用错误账号。
   */
  private buildSslProvider(directoryUrl: string) {
    const digest = crypto.createHash("sha256").update(directoryUrl).digest("hex").slice(0, 16);
    return `localca-${digest}`;
  }

  private async getResolvedDirectoryUrl(): Promise<string> {
    if (this.resolvedDirectoryUrl) {
      return this.resolvedDirectoryUrl;
    }
    const ca = await this.prepareLocalCa(true);
    const baseUrl = String(ca.effectiveBaseUrl || "").replace(/\/+$/, "");
    if (!baseUrl) {
      throw new Error("无法解析本地CA的访问地址，请先在CA设置中配置Base URL");
    }
    const directoryUrl = `${baseUrl}/api/acme/${ca.id}/directory`;
    this.resolvedDirectoryUrl = directoryUrl;
    return directoryUrl;
  }

  private async isDirectIssueMode(acmeAccount?: any): Promise<boolean> {
    if (this.directIssueCache != null) {
      return this.directIssueCache;
    }
    this.directIssueCache = false;
    try {
      const account =
        acmeAccount ??
        (this.acmeAccountAccessId ? this.parseAcmeAccount((await this.getAccess(this.acmeAccountAccessId)).account) : null);
      if (!account?.accountKey || !account?.accountUri) {
        return false;
      }
      // 签名POST-as-GET读取账户资源上的新鲜EAB特权状态（服务端裁决，客户端仅规划）
      const client = new acme.Client({
        sslProvider: account.caType,
        directoryUrl: account.directoryUrl,
        accountKey: account.accountKey,
        accountUrl: account.accountUri,
        logger: this.logger,
        signal: this.ctx.signal,
      } as any);
      const resp = await client.updateAccount({});
      this.directIssueCache = resp?.certdEab?.privileged === true;
    } catch (e: any) {
      this.logger.warn(`读取EAB特权状态失败，按真实域名验证处理：${e?.message || e}`);
      this.directIssueCache = false;
    }
    return this.directIssueCache;
  }
}

new CertApplyLocalCa();

// 根据签发方式收起无关字段，避免直接签发用户被ACME必填项阻塞
const localCaInput = (CertApplyLocalCa as any).define?.input;
if (localCaInput) {
localCaInput.mode.order = -10000;
if (localCaInput.caId) localCaInput.caId.mergeScript = `return {
  show: ctx.compute(({ form }) => form.mode === 'local-direct'),
  required: ctx.compute(({ form }) => form.mode === 'local-direct')
}`;
if (localCaInput.keyType) localCaInput.keyType.mergeScript = `return {
  show: ctx.compute(({ form }) => form.mode === 'local-direct'),
  required: ctx.compute(({ form }) => form.mode === 'local-direct')
}`;
if (localCaInput.validityDays) localCaInput.validityDays.mergeScript = `return {
  show: ctx.compute(({ form }) => form.mode === 'local-direct'),
  required: ctx.compute(({ form }) => form.mode === 'local-direct')
}`;
if (localCaInput.email) localCaInput.email.mergeScript = `return { show: ctx.compute(({ form }) => ${JSON.stringify(ACME_MODES)}.includes(form.mode)), required: ctx.compute(({ form }) => ${JSON.stringify(ACME_MODES)}.includes(form.mode)) }`;
if (localCaInput.sslProvider) {
  localCaInput.sslProvider.title = "中间CA颁发机构";
  localCaInput.sslProvider.mergeScript = `return {
    show: ctx.compute(({ form }) => form.mode === 'local-acme'),
    required: ctx.compute(({ form }) => form.mode === 'local-acme')
  }`;
}
if (localCaInput.version) localCaInput.version.show = false;
const acmeModes = JSON.stringify(ACME_MODES);
if (localCaInput.challengeType) localCaInput.challengeType.value = "auto";
if (localCaInput.challengeType) localCaInput.challengeType.mergeScript = `return {
  show: ctx.compute(({ form }) => ${acmeModes}.includes(form.mode)),
  required: ctx.compute(({ form }) => ${acmeModes}.includes(form.mode)),
  value: "auto"
}`;
if (localCaInput.dnsProviderType) localCaInput.dnsProviderType.mergeScript = `return {
  show: ctx.compute(({ form }) => ${acmeModes}.includes(form.mode) && form.challengeType === 'dns'),
  component: {
    onSelectedChange: ctx.compute(({ form }) => ($event) => { form.dnsProviderAccessType = $event.accessType }),
    onChange: ctx.compute(({ form }) => () => { form.dnsProviderAccess = null })
  }
}`;
if (localCaInput.dnsProviderAccess) localCaInput.dnsProviderAccess.mergeScript = `return {
  component: { type: ctx.compute(({ form }) => form.dnsProviderAccessType || form.dnsProviderType) },
  show: ctx.compute(({ form }) => ${acmeModes}.includes(form.mode) && form.challengeType === 'dns')
}`;
if (localCaInput.domainsVerifyPlan) localCaInput.domainsVerifyPlan.mergeScript = `return {
  component: {
    domains: ctx.compute(({ form }) => form.domains),
    defaultType: ctx.compute(({ form }) => form.challengeType || 'cname'),
    caType: ctx.compute(({ form }) => form.sslProvider),
    acmeAccountAccessId: ctx.compute(({ form }) => form.acmeAccountAccessId)
  },
  show: ctx.compute(({ form }) => ${acmeModes}.includes(form.mode) && ['cname','http','dnses','dns-persist'].includes(form.challengeType)),
  helper: ctx.compute(({ form }) => {
    if (form.challengeType === 'cname') return '请按照上面的提示，给要申请证书的域名添加CNAME记录，添加后，点击验证，验证成功后不要删除记录，申请和续期证书会一直用它';
    if (form.challengeType === 'http') return '请按照上面的提示，给每个域名设置文件上传配置，证书申请过程中会上传校验文件到网站根目录文件夹下，请确保该校验文件可以公网http访问到';
    if (form.challengeType === 'dnses') return '给每个域名单独配置dns提供商';
    if (form.challengeType === 'dns-persist') return '请先创建并校验_validation-persist TXT持久记录，校验成功后才能提交流水线';
    return '';
  })
}`;
if (localCaInput.privateKeyType) localCaInput.privateKeyType.mergeScript = `return { show: ctx.compute(({ form }) => ${acmeModes}.includes(form.mode)) }`;
if (localCaInput.acmeAccountAccessId) localCaInput.acmeAccountAccessId.mergeScript = `return {
  show: ctx.compute(({ form }) => ${acmeModes}.includes(form.mode)),
  required: ctx.compute(({ form }) => form.mode === 'local-acme'),
  component: { subtype: ctx.compute(({ form }) => form.sslProvider || 'custom') }
}`;
if (localCaInput.reuseKey) localCaInput.reuseKey.mergeScript = `return { show: ctx.compute(({ form }) => ${acmeModes}.includes(form.mode)) }`;
if (localCaInput.skipLocalVerify) localCaInput.skipLocalVerify.mergeScript = `return { show: ctx.compute(({ form }) => ${acmeModes}.includes(form.mode)) }`;
if (localCaInput.maxCheckRetryCount) localCaInput.maxCheckRetryCount.mergeScript = `return { show: ctx.compute(({ form }) => ${acmeModes}.includes(form.mode)) }`;
if (localCaInput.waitDnsDiffuseTime) localCaInput.waitDnsDiffuseTime.mergeScript = `return { show: ctx.compute(({ form }) => ${acmeModes}.includes(form.mode)) }`;
if (localCaInput.useProxy) localCaInput.useProxy.show = false;
if (localCaInput.reverseProxy) localCaInput.reverseProxy.show = false;
// 本地CA插件不需要通用ACME的厂商/链配置，直接移除避免冗余
for (const key of ["certProfile", "preferredChain", "googleAccessId", "eabAccessId", "googleCommonEabAccessId", "googleCommonAcmeAccountAccessId", "zerosslCommonEabAccessId", "zerosslCommonAcmeAccountAccessId", "sslcomCommonEabAccessId", "sslcomCommonAcmeAccountAccessId", "litesslCommonEabAccessId", "litesslCommonAcmeAccountAccessId"]) {
  delete localCaInput[key];
}
if (localCaInput.certApplyRetryCount) localCaInput.certApplyRetryCount.mergeScript = `return { show: ctx.compute(({ form }) => ${JSON.stringify(ACME_MODES)}.includes(form.mode)) }`;
}
