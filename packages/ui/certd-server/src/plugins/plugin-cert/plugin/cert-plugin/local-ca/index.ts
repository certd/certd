import { IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertReader } from "@certd/plugin-lib";
import { CertApplyBaseConvertPlugin } from "../base-convert.js";
import type { LocalCaGetter } from "../../../../../modules/cert/service/local-ca-getter.js";
import type { LocalCaSignerGetter } from "../../../../../modules/cert/service/local-ca-signer-getter.js";
import { filterAllowedDomains, type LocalCaKeyType } from "../../../../../modules/cert/service/local-ca-crypto.js";

@IsTaskPlugin({
  name: "CertApplyLocalCa",
  icon: "ph:seal-check",
  title: "本地CA证书申请",
  group: pluginGroups.cert.key,
  desc: "使用本地中间CA签发证书，无需域名验证；客户端需信任根CA，建议用于内部/测试环境",
  default: {
    strategy: {
      runStrategy: RunStrategy.AlwaysRun,
    },
  },
  i18n: {
    "en-US": {
      title: "Request Certificate (Local CA)",
      desc: "Issue certificates from your own local root CA without domain validation. Clients must trust the root CA; recommended for internal/testing environments.",
      input: {
        caId: { title: "Intermediate CA", helper: "Select an intermediate CA. Leaf certificates are issued by it, and the root CA must be trusted." },
        keyType: { title: "Key Type" },
        validityDays: { title: "Validity (Days)", helper: "Capped by the CA's remaining validity." },
        renewDays: { title: "Renew Before (Days)", helper: "Reissue when the current certificate expires within this window." },
      },
    },
  },
})
export class CertApplyLocalCa extends CertApplyBaseConvertPlugin {
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
    title: "中间CA",
    helper: "选择中间CA；叶子证书由该CA签发，客户端需要信任其根CA",
    component: {
      name: "local-ca-selector",
      vModel: "modelValue",
    },
    required: true,
    order: -9999,
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
    title: "提前更新天数",
    value: 20,
    helper: "当前证书距离过期小于该天数时重新签发",
    component: {
      name: "a-input-number",
      vModel: "value",
      min: 1,
      max: 3650,
    },
    required: true,
    order: 92,
  })
  renewDays = 20;

  async onInit() {
    // 无额外初始化
  }

  async execute(): Promise<string | void> {
    if (!this.caId) {
      throw new Error("请选择本地CA");
    }
    const domains = (this.domains || []).filter(Boolean);
    if (domains.length === 0) {
      throw new Error("请填写证书域名");
    }

    const getter = await this.ctx.serviceGetter.get<LocalCaGetter>("localCaGetter");
    const ca = await getter.getCa(this.caId);
    if (ca.caType !== "intermediate") {
      throw new Error("根CA不能直接签发叶子证书，请选择中间CA");
    }
    if (ca.disabled) {
      throw new Error("本地CA已禁用");
    }

    let allowedDomains: string[] = [];
    try {
      allowedDomains = ca.allowedDomains ? JSON.parse(ca.allowedDomains) : [];
    } catch (e) {
      allowedDomains = [];
    }
    const allowedList = filterAllowedDomains(domains, allowedDomains);
    const skipped = domains.filter(item => !allowedList.includes(item));
    if (allowedList.length === 0) {
      throw new Error(`所有域名都不在CA允许签发范围内：${domains.join(",")}`);
    }
    if (skipped.length > 0) {
      this.logger.warn(`以下域名不在CA允许范围内，已跳过：${skipped.join(",")}`);
    }
    this.domains = allowedList;

    const renewDays = Math.max(1, Number(this.renewDays || 20));
    const validityDays = Math.max(1, Number(this.validityDays || 365));
    const old = await this.readLastCert();
    const willExpire = old != null && old.expires - Date.now() <= renewDays * 24 * 3600 * 1000;
    if (old && !willExpire && !this.ctx.inputChanged && skipped.length === 0) {
      await this.output(old, false);
      this.logger.info("证书未到期且参数未变化，跳过申请");
      return "skip";
    }

    this.checkSignal();
    const signer = await this.ctx.serviceGetter.get<LocalCaSignerGetter>("localCaSignerGetter");
    const result = await signer.issueLeaf({
      caId: this.caId,
      domains: allowedList,
      keyType: this.keyType,
      validityDays,
    });
    const certReader = new CertReader({
      crt: result.crt,
      key: result.key,
    });
    this.registerSecret(certReader.cert.key);

    this.clearLastStatus();
    await this.output(certReader, true);
    await this.emitCertApplySuccess({
      localCaId: ca.id,
      serialNumber: result.serialNumber,
    });
    this.logger.info(`本地CA证书签发成功，序列号：${result.serialNumber}`);
  }
}

new CertApplyLocalCa();
