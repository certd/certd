import crypto from "node:crypto";
import net from "node:net";
import { IsTaskPlugin, pluginGroups, RunStrategy, TaskInput, TaskOutput } from "@certd/pipeline";
import { CertReader } from "@certd/plugin-lib";
import type { CustomAcmeProvider } from "@certd/lib-server";
import { CertApplyPlugin } from "../apply.js";
import { CertApplyBaseConvertPlugin } from "../base-convert.js";
import type { CertInfo } from "../acme.js";
import type { EabAccess } from "../../../access/index.js";
import type { LocalCaGetter } from "../../../../../modules/local-ca/service/local-ca-getter.js";
import type { LocalCaSignerGetter } from "../../../../../modules/local-ca/service/local-ca-signer-getter.js";
import { filterAllowedDomains, type LocalCaKeyType } from "../../../../../modules/local-ca/service/local-ca-crypto.js";
import { parseLocalCaDirectory } from "../../../../../modules/local-ca/service/local-ca-directory.js";
import { isSameAcmeUrl } from "../../../../../modules/acme-server/service/acme-url.js";

export type LocalCaApplyMode = "local-direct" | "local-acme" | "remote-acme";

type LocalCaSubscribeInfo = {
  id: number;
  name: string;
  caType: string;
  disabled: boolean;
  revoked?: boolean;
  notAfter?: number;
  acmeEnabled?: boolean;
  acmeDirectIssue?: boolean;
  allowedDomains?: string | null;
  effectiveBaseUrl?: string;
};

const ACME_MODES: LocalCaApplyMode[] = ["local-acme", "remote-acme"];

@IsTaskPlugin({
  name: "CertApplyLocalCa",
  icon: "ph:seal-check",
  title: "本地CA证书申请",
  group: pluginGroups.cert.key,
  desc: "支持本地CA直接签发、本地ACME与远程ACME三种模式；客户端需信任对应根CA，建议用于内部/测试环境",
  default: {
    strategy: {
      runStrategy: RunStrategy.AlwaysRun,
    },
  },
  i18n: {
    "en-US": {
      title: "Request Certificate (Local CA)",
      desc: "Issue certificates through local direct signing, local ACME, or a remote ACME server. Clients must trust the corresponding root CA.",
      input: {
        mode: {
          title: "Issuance Mode",
          optionsMapping: {
            "local-direct": "Local Direct Signing",
            "local-acme": "Local ACME",
            "remote-acme": "Remote ACME",
          },
          helper: "Local direct signing skips ACME/domain validation. Local/remote ACME follows the ACME protocol and can skip validation only when the server enables EAB direct issue.",
        },
        caId: { title: "CA", helper: "Local direct signing requires an intermediate CA. Local ACME requires ACME to be enabled on that CA." },
        keyType: { title: "Key Type" },
        validityDays: { title: "Validity (Days)", helper: "Capped by the CA's remaining validity." },
        directoryUrl: { title: "ACME Directory URL", helper: "Admin only. For example https://certd.example.com/api/acme/12/directory" },
        eabKid: { title: "EAB KID", helper: "Admin only. Leave empty and use an ACME account instead." },
        eabHmacKey: { title: "EAB HMAC Key", helper: "Admin only. Leave empty and use an ACME account instead." },
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
        { value: "remote-acme", label: "远程ACME服务" },
      ],
    },
    required: true,
    order: -10000,
    helper: "直接签发不经过ACME和域名校验；本地/远程ACME走标准协议，仅当服务端开启EAB直签时可跳过域名校验。远程ACME填写公网地址，本机/链路本地地址仅管理员可用",
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
    helper: "本地CA直接签发和本地ACME模式需要选择中间CA；客户端需要信任其根CA",
    component: {
      name: "local-ca-selector",
      vModel: "modelValue",
    },
    required: true,
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

  @TaskInput({
    title: "远程ACME Directory URL",
    helper: "远程ACME模式必填，例如 https://certd.example.com/api/acme/12/directory",
    component: {
      placeholder: "https://your-certd.example.com/api/acme/12/directory",
    },
    order: -9980,
  })
  directoryUrl = "";

  @TaskInput({
    title: "EAB KID",
    helper: "仅系统管理员可直接填写EAB凭证；普通用户请使用下方ACME账号授权",
    component: {
      placeholder: "eab_xxxxxxxx",
    },
    order: -9970,
  })
  eabKid = "";

  @TaskInput({
    title: "EAB HMAC Key",
    helper: "仅系统管理员可直接填写EAB HMAC Key；普通用户请使用下方ACME账号授权",
    component: {
      name: "input-password",
      vModel: "value",
    },
    order: -9960,
  })
  eabHmacKey = "";

  private localCa?: LocalCaSubscribeInfo;
  private resolvedDirectoryUrl?: string;
  private directCertMeta?: { localCaId: number; serialNumber: string };
  private directIssueCache?: boolean;

  async onInit() {
    if (!this.mode) {
      this.mode = "local-direct";
    }
    if (this.eabHmacKey) {
      this.registerSecret(this.eabHmacKey);
    }
    if (this.mode === "remote-acme") {
      this.assertRemoteUrlAllowed();
    }
    if (this.mode !== "local-direct") {
      this.assertInlineEabAllowed();
    }
    if (this.mode === "local-acme") {
      await this.prepareLocalCa(true);
    }
  }

  getCheckChangeInputKeys(): string[] {
    const keys = super.getCheckChangeInputKeys();
    return [...new Set([...keys, "mode", "caId", "keyType", "validityDays", "directoryUrl", "eabKid"])];
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
    if (this.mode === "remote-acme") {
      this.assertRemoteUrlAllowed();
    }
    const directoryUrl = await this.getResolvedDirectoryUrl();
    this.sslProvider = this.buildSslProvider(directoryUrl) as any;
    if (!this.challengeType) {
      this.challengeType = "auto";
    }
    if (this.acmeAccountAccessId) {
      const access: any = await this.getAccess(this.acmeAccountAccessId);
      const account = this.parseAcmeAccount(access.account);
      if (!isSameAcmeUrl(account.directoryUrl, directoryUrl)) {
        throw new Error(`ACME账号绑定的Directory URL与当前CA不一致，请重新生成ACME账号（账号：${account.directoryUrl || "-"}，当前：${directoryUrl}）`);
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
    if (this.mode === "local-direct" && this.directCertMeta) {
      // 直接签发不走ACME，需要把本地CA关联信息直接写入证书事件
      return await CertApplyBaseConvertPlugin.prototype.emitCertApplySuccess.call(this, this.directCertMeta);
    }
    return await super.emitCertApplySuccess();
  }

  protected async getAcmeProvider(): Promise<CustomAcmeProvider> {
    const directoryUrl = await this.getResolvedDirectoryUrl();
    this.sslProvider = this.buildSslProvider(directoryUrl) as any;
    return {
      title: this.mode === "local-acme" ? "本地ACME" : "远程ACME",
      sslProvider: "custom",
      directoryUrl,
      builtIn: false,
      needEAB: true,
      reverseProxy: this.reverseProxy || "",
    } as any;
  }

  protected async resolveCustomAcmeEab(): Promise<EabAccess | null | undefined> {
    if (!this.hasInlineEab()) {
      return undefined;
    }
    this.assertInlineEabAllowed();
    return { kid: this.eabKid.trim(), hmacKey: this.eabHmacKey.trim() } as any;
  }

  protected requiresAcmeAccount(): boolean {
    return this.acmeAccountAccessId != null || !this.hasInlineEab();
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

  private hasInlineEab() {
    return !!(this.eabKid && this.eabHmacKey);
  }

  /**
   * 远程Directory URL由任务配置直接指定，仅允许系统管理员使用，避免普通用户借ACME客户端发起内网请求。
   */
  private assertRemoteUrlAllowed() {
    const text = String(this.directoryUrl || "").trim();
    if (!text) {
      return;
    }
    let url: URL;
    try {
      url = new URL(text);
    } catch {
      throw new Error("远程ACME Directory URL格式不正确");
    }
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("远程ACME Directory URL仅支持 http/https");
    }
    if (this.isAdmin()) {
      return;
    }
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    const blocked = host === "localhost" || host.endsWith(".localhost") || host === "metadata.google.internal" || host === "100.100.100.200" || host === "169.254.169.254";
    const ipVersion = net.isIP(host);
    const loopbackOrLinkLocal = ipVersion === 4 ? host.startsWith("127.") || host.startsWith("169.254.") : ipVersion === 6 ? host === "::1" || host.startsWith("fe80:") : false;
    if (blocked || loopbackOrLinkLocal) {
      throw new Error("普通用户不能使用本机或链路本地地址作为远程ACME Directory URL，请改用ACME账号授权或联系管理员");
    }
  }

  /**
   * 任务输入中的EAB HMAC为明文存储，仅允许系统管理员使用；普通用户应使用加密存储的ACME账号授权。
   */
  private assertInlineEabAllowed() {
    if (this.hasInlineEab() && !this.isAdmin()) {
      throw new Error("任务内直接填写EAB凭证仅限系统管理员；普通用户请使用ACME账号授权");
    }
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
    const scope = this.hasInlineEab() ? `${directoryUrl}#${this.eabKid}` : directoryUrl;
    const digest = crypto.createHash("sha256").update(scope).digest("hex").slice(0, 16);
    return `localca-${digest}`;
  }

  private async getResolvedDirectoryUrl(): Promise<string> {
    if (this.mode === "remote-acme") {
      this.assertRemoteUrlAllowed();
    }
    if (this.resolvedDirectoryUrl) {
      return this.resolvedDirectoryUrl;
    }
    let directoryUrl: string;
    if (this.mode === "remote-acme") {
      directoryUrl = String(this.directoryUrl || "").trim();
      if (!directoryUrl) {
        throw new Error("远程ACME模式请填写Directory URL");
      }
    } else {
      const ca = await this.prepareLocalCa(true);
      const baseUrl = String(ca.effectiveBaseUrl || "").replace(/\/+$/, "");
      if (!baseUrl) {
        throw new Error("无法解析本地CA的访问地址，请先在CA设置中配置Base URL");
      }
      directoryUrl = `${baseUrl}/api/acme/${ca.id}/directory`;
    }
    this.resolvedDirectoryUrl = directoryUrl;
    return directoryUrl;
  }

  private async isDirectIssueMode(acmeAccount?: any): Promise<boolean> {
    if (this.directIssueCache != null) {
      return this.directIssueCache;
    }
    const hasAccountCredential = this.hasInlineEab() || acmeAccount != null || this.acmeAccountAccessId != null;
    if (!hasAccountCredential) {
      return false;
    }
    if (this.mode === "remote-acme") {
      this.assertRemoteUrlAllowed();
    }
    if (this.mode === "local-acme") {
      const ca = await this.prepareLocalCa(true);
      this.directIssueCache = ca.acmeDirectIssue === true;
      return this.directIssueCache;
    }
    const directoryUrl = await this.getResolvedDirectoryUrl();
    const candidate = parseLocalCaDirectory(directoryUrl);
    if (!candidate) {
      this.directIssueCache = false;
      return false;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await (globalThis as any).fetch(directoryUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      const meta = data?.meta?.certdLocalCa;
      this.directIssueCache = Number(meta?.caId) === candidate.caId && meta?.directIssue === true && meta?.eabRequired === true;
      return this.directIssueCache;
    } catch (e: any) {
      this.directIssueCache = false;
      this.logger.warn(`读取远程ACME直签配置失败，按真实验证处理：${e?.message || e}`);
      return false;
    } finally {
      clearTimeout(timer);
    }
  }
}

new CertApplyLocalCa();

// 根据签发方式收起无关字段，避免直接签发用户被ACME必填项阻塞
const localCaInput = (CertApplyLocalCa as any).define?.input;
if (localCaInput) {
localCaInput.mode.order = -10000;
localCaInput.caId.mergeScript = `return {
  show: ctx.compute(({ form }) => form.mode !== 'remote-acme'),
  required: ctx.compute(({ form }) => form.mode !== 'remote-acme')
}`;
localCaInput.keyType.mergeScript = `return {
  show: ctx.compute(({ form }) => form.mode === 'local-direct'),
  required: ctx.compute(({ form }) => form.mode === 'local-direct')
}`;
localCaInput.validityDays.mergeScript = `return {
  show: ctx.compute(({ form }) => form.mode === 'local-direct'),
  required: ctx.compute(({ form }) => form.mode === 'local-direct')
}`;
localCaInput.directoryUrl.mergeScript = `return {
  show: ctx.compute(({ form }) => form.mode === 'remote-acme'),
  required: ctx.compute(({ form }) => form.mode === 'remote-acme')
}`;
localCaInput.eabKid.mergeScript = `return { show: ctx.compute(({ form }) => ${JSON.stringify(ACME_MODES)}.includes(form.mode)) }`;
localCaInput.eabHmacKey.mergeScript = localCaInput.eabKid.mergeScript;
localCaInput.email.mergeScript = `return { show: ctx.compute(({ form }) => ${JSON.stringify(ACME_MODES)}.includes(form.mode)), required: ctx.compute(({ form }) => ${JSON.stringify(ACME_MODES)}.includes(form.mode)) }`;
localCaInput.sslProvider.show = false;
localCaInput.version.show = false;
const acmeModes = JSON.stringify(ACME_MODES);
localCaInput.challengeType.value = "auto";
localCaInput.challengeType.mergeScript = `return {
  show: ctx.compute(({ form }) => ${acmeModes}.includes(form.mode)),
  required: ctx.compute(({ form }) => ${acmeModes}.includes(form.mode)),
  value: "auto"
}`;
localCaInput.dnsProviderType.mergeScript = `return {
  show: ctx.compute(({ form }) => ${acmeModes}.includes(form.mode) && form.challengeType === 'dns'),
  component: {
    onSelectedChange: ctx.compute(({ form }) => ($event) => { form.dnsProviderAccessType = $event.accessType }),
    onChange: ctx.compute(({ form }) => () => { form.dnsProviderAccess = null })
  }
}`;
localCaInput.dnsProviderAccess.mergeScript = `return {
  component: { type: ctx.compute(({ form }) => form.dnsProviderAccessType || form.dnsProviderType) },
  show: ctx.compute(({ form }) => ${acmeModes}.includes(form.mode) && form.challengeType === 'dns')
}`;
localCaInput.domainsVerifyPlan.mergeScript = `return {
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
localCaInput.privateKeyType.mergeScript = `return { show: ctx.compute(({ form }) => ${acmeModes}.includes(form.mode)) }`;
localCaInput.acmeAccountAccessId.required = false;
localCaInput.acmeAccountAccessId.mergeScript = `return {
  show: ctx.compute(({ form }) => ${acmeModes}.includes(form.mode)),
  required: false,
  component: { subtype: ctx.compute(({ form }) => form.sslProvider || 'custom') }
}`;
localCaInput.reuseKey.mergeScript = `return { show: ctx.compute(({ form }) => ${acmeModes}.includes(form.mode)) }`;
localCaInput.skipLocalVerify.mergeScript = `return { show: ctx.compute(({ form }) => ${acmeModes}.includes(form.mode)) }`;
localCaInput.maxCheckRetryCount.mergeScript = `return { show: ctx.compute(({ form }) => ${acmeModes}.includes(form.mode)) }`;
localCaInput.waitDnsDiffuseTime.mergeScript = `return { show: ctx.compute(({ form }) => ${acmeModes}.includes(form.mode)) }`;
localCaInput.useProxy.mergeScript = `return { show: ctx.compute(({ form }) => form.mode === 'remote-acme') }`;
localCaInput.reverseProxy.mergeScript = `return {
  show: ctx.compute(({ form }) => form.mode === 'remote-acme'),
  component: { placeholder: 'certd.yourproxy.com' }
}`;
localCaInput.certProfile.show = false;
localCaInput.preferredChain.show = false;
localCaInput.eabAccessId.show = false;
localCaInput.googleAccessId.show = false;
localCaInput.certApplyRetryCount.mergeScript = `return { show: ctx.compute(({ form }) => ${JSON.stringify(ACME_MODES)}.includes(form.mode)) }`;
}
