import { IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertReader } from "@certd/plugin-lib";
import { CertApplyBaseConvertPlugin } from "../base-convert.js";
import type { LocalCaGetter } from "../../../../../modules/cert/service/local-ca-getter.js";
import type { LocalCaKeyType } from "../../../../../modules/cert/service/local-ca-crypto.js";

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
        { value: "rsa4096", label: "RSA 4096" },
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

    const renewDays = Math.max(1, Number(this.renewDays || 20));
    const validityDays = Math.max(1, Number(this.validityDays || 365));
    const old = await this.readLastCert();
    const willExpire = old != null && old.expires - Date.now() <= renewDays * 24 * 3600 * 1000;
    if (old && !willExpire && !this.ctx.inputChanged) {
      await this.output(old, false);
      this.logger.info("证书未到期且参数未变化，跳过申请");
      return "skip";
    }

    this.checkSignal();
    const result = await getter.issueLeaf({
      caId: this.caId,
      domains,
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
