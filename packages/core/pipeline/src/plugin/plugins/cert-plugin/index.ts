import { AbstractPlugin } from "../../abstract-plugin";
import forge from "node-forge";
import { IsTask, TaskInput, TaskOutput, TaskPlugin } from "../../api";
import dayjs from "dayjs";
import { dnsProviderRegistry } from "../../../dns-provider";
import { AbstractDnsProvider } from "../../../dns-provider/abstract-dns-provider";
import { AcmeService } from "./acme";

export type CertInfo = {
  crt: string;
  key: string;
  csr: string;
};
@IsTask(() => {
  return {
    name: "CertApply",
    title: "证书申请",
    input: {
      domains: {
        title: "域名",
        component: {
          name: "a-select",
          vModel: "value",
          mode: "tags",
        },
        col: {
          span: 24,
        },
        helper: "请输入域名",
      },
      email: {
        title: "邮箱",
        component: {
          name: "a-input",
          vModel: "value",
        },
        helper: "请输入邮箱",
      },
      dnsProviderType: {
        title: "DNS提供商",
        component: {
          name: "pi-dns-provider-selector",
        },
        helper: "请选择dns解析提供商",
      },
      dnsProviderAccess: {
        title: "DNS解析授权",
        component: {
          name: "pi-access-selector",
        },
        helper: "请选择dns解析提供商授权",
      },
      renewDays: {
        title: "更新天数",
        value: 20,
        component: {
          name: "a-input-number",
        },
        helper: "到期前多少天后更新证书",
      },
      forceUpdate: {
        title: "强制更新",
        value: false,
        component: {
          name: "a-switch",
          vModel: "checked",
        },
        helper: "是否强制重新申请证书",
      },
    },
    output: {
      cert: {
        key: "cert",
        type: "CertInfo",
        title: "域名证书",
      },
    },
  };
})
export class CertApplyPlugin extends AbstractPlugin implements TaskPlugin {
  // @ts-ignore
  acme: AcmeService;
  protected async onInit() {
    this.acme = new AcmeService({ userContext: this.userContext, logger: this.logger });
  }

  async execute(input: TaskInput): Promise<TaskOutput> {
    const oldCert = await this.condition(input);
    if (oldCert != null) {
      return {
        cert: oldCert,
      };
    }
    const cert = await this.doCertApply(input);
    return { cert };
  }

  /**
   * 是否更新证书
   * @param input
   */
  async condition(input: TaskInput) {
    if (input.forceUpdate) {
      return null;
    }
    let oldCert;
    try {
      oldCert = await this.readCurrentCert();
    } catch (e) {
      this.logger.warn("读取cert失败：", e);
    }
    if (oldCert == null) {
      this.logger.info("还未申请过，准备申请新证书");
      return null;
    }

    const ret = this.isWillExpire(oldCert.expires, input.renewDays);
    if (!ret.isWillExpire) {
      this.logger.info(`证书还未过期：过期时间${dayjs(oldCert.expires).format("YYYY-MM-DD HH:mm:ss")},剩余${ret.leftDays}天`);
      return oldCert;
    }
    this.logger.info("即将过期，开始更新证书");
    return null;
  }

  async doCertApply(input: TaskInput) {
    const email = input["email"];
    const domains = input["domains"];
    const dnsProviderType = input["dnsProviderType"];
    const dnsProviderAccessId = input["dnsProviderAccess"];
    const csrInfo = input["csrInfo"];
    this.logger.info("开始申请证书,", email, domains);

    const dnsProviderClass = dnsProviderRegistry.get(dnsProviderType);
    const access = await this.accessService.getById(dnsProviderAccessId);
    // @ts-ignore
    const dnsProvider: AbstractDnsProvider = new dnsProviderClass();
    dnsProvider.doInit({ access, logger: this.logger });

    const cert = await this.acme.order({
      email,
      domains,
      dnsProvider,
      csrInfo,
      isTest: false,
    });

    await this.writeCert(cert);
    const ret = await this.readCurrentCert();

    return {
      ...ret,
      isNew: true,
    };
  }

  formatCert(pem: string) {
    pem = pem.replace(/\r/g, "");
    pem = pem.replace(/\n\n/g, "\n");
    pem = pem.replace(/\n$/g, "");
    return pem;
  }

  async writeCert(cert: { crt: string; key: string; csr: string }) {
    const newCert = {
      crt: this.formatCert(cert.crt),
      key: this.formatCert(cert.key),
      csr: this.formatCert(cert.csr),
    };
    await this.pipelineContext.set("cert", newCert);
  }

  async readCurrentCert() {
    const cert: CertInfo = await this.pipelineContext.get("cert");
    if (cert == null) {
      return undefined;
    }
    const { detail, expires } = this.getCrtDetail(cert.crt);
    return {
      ...cert,
      detail,
      expires: expires.getTime(),
    };
  }

  getCrtDetail(crt: string) {
    const pki = forge.pki;
    const detail = pki.certificateFromPem(crt.toString());
    const expires = detail.validity.notAfter;
    return { detail, expires };
  }

  /**
   * 检查是否过期，默认提前20天
   * @param expires
   * @param maxDays
   * @returns {boolean}
   */
  isWillExpire(expires: number, maxDays = 20) {
    if (expires == null) {
      throw new Error("过期时间不能为空");
    }
    // 检查有效期
    const leftDays = dayjs(expires).diff(dayjs(), "day");
    return {
      isWillExpire: leftDays < maxDays,
      leftDays,
    };
  }
}
