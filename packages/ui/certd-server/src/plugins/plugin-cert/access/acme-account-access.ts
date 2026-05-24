import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";
import * as acme from "@certd/acme-client";
import { AcmeService } from "../plugin/cert-plugin/acme.js";

export type AcmeAccountInfo = {
  accountKey: string;
  accountUri: string;
  caType: string;
  email: string;
  directoryUrl: string;
  eab?: {
    kid?: string;
    hmacKey?: string;
    usedAt: number;
  };
};

function parseAccount(account?: string | AcmeAccountInfo): AcmeAccountInfo | null {
  if (!account) {
    return null;
  }
  if (typeof account !== "string") {
    return account;
  }
  return JSON.parse(account);
}

@IsAccess({
  name: "acmeAccount",
  title: "ACME账号",
  desc: "用于复用ACME账号私钥和账号地址，证书申请时不再临时创建账号",
  icon: "ph:certificate",
  subtype: "caType",
} as any)
export class AcmeAccountAccess extends BaseAccess {
  @AccessInput({
    title: "颁发机构",
    component: {
      name: "a-select",
      options: [
        { value: "letsencrypt", label: "Let's Encrypt" },
        { value: "letsencrypt_staging", label: "Let's Encrypt测试环境" },
        { value: "google", label: "Google" },
        { value: "zerossl", label: "ZeroSSL" },
        { value: "litessl", label: "litessl" },
        { value: "sslcom", label: "SSL.com" },
      ],
    },
    required: true,
    mergeScript: `
    return {
      component: {
        disabled: ctx.compute(({form})=> !!form.access?.account)
      }
    }
    `,
  })
  caType = "letsencrypt";

  @AccessInput({
    title: "邮箱",
    component: {
      placeholder: "user@example.com",
    },
    rules: [{ type: "email", message: "请输入正确的邮箱" }],
    required: true,
    mergeScript: `
    return {
      component: {
        disabled: ctx.compute(({form})=> !!form.access?.account)
      }
    }
    `,
  })
  email = "";

  @AccessInput({
    title: "ACME Directory URL",
    component: {
      placeholder: "自定义ACME服务端点",
    },
    helper: "自定义ACME时必填，其他颁发机构默认自动使用内置端点",
    required: false,
    mergeScript: `
    return {
      show: false,
    }
    `,
  })
  directoryUrl = "";

  @AccessInput({
    title: "EAB KID",
    component: {
      placeholder: "需要EAB的颁发机构生成账号时填写",
    },
    helper:
      "需要提供EAB授权" +
      "\nZeroSSL：请前往[zerossl开发者中心](https://app.zerossl.com/developer),生成 'EAB Credentials'" +
      "\nGoogle:请查看[google获取eab帮助文档](https://certd.docmirror.cn/guide/use/google/),用过一次后会绑定邮箱，后续复用EAB要用同一个邮箱" +
      "\nSSL.com:[SSL.com账号页面](https://secure.ssl.com/account),然后点击api credentials链接，然后点击编辑按钮，查看Secret key和HMAC key" +
      "\nlitessl:[litesslEAB页面](https://freessl.cn/automation/eab-manager),然后点击新增EAB",
    required: false,
    encrypt: true,
    mergeScript: `
    return {
      show: ctx.compute(({form})=>{
        const caType = form.access?.caType;
        return ['google','zerossl','sslcom','litessl'].includes(caType);
      }),
      component: {
        disabled: ctx.compute(({form})=> !!form.access?.account)
      }
    }
    `,
  })
  eabKid = "";

  @AccessInput({
    title: "EAB HMAC Key",
    component: {
      placeholder: "需要EAB的颁发机构生成账号时填写",
    },
    required: false,
    encrypt: true,
    mergeScript: `
    return {
      show: ctx.compute(({form})=>{
        const caType = form.access?.caType;
        return ['google','zerossl','sslcom','litessl'].includes(caType);
      }),
      component: {
        disabled: ctx.compute(({form})=> !!form.access?.account)
      }
    }
    `,
  })
  eabHmacKey = "";

  @AccessInput({
    title: "ACME账号信息",
    component: {
      name: "refresh-input",
      action: "GenerateAccount",
      buttonText: "生成ACME账号",
      successMessage: "ACME账号已生成，请保存授权配置",
    },
    required: true,
    helper: "请生成ACME账号，账号一旦生成不允许修改",
    encrypt: true,
    mergeScript: `
    return {
      component: {
        disabled: ctx.compute(({form})=> !!form.access?.account)
      }
    }
    `,
  })
  account = "";

  getDirectoryUrl() {
    if (this.caType === "custom") {
      if (!this.directoryUrl) {
        throw new Error("自定义ACME需要填写Directory URL");
      }
      return this.directoryUrl;
    }
    return acme.getDirectoryUrl({ sslProvider: this.caType, pkType: "rsa_2048" });
  }

  async onGenerateAccount() {
    if (!this.caType) {
      throw new Error("请先选择颁发机构");
    }
    if (!this.email) {
      throw new Error("请先填写邮箱");
    }
    const needEab = ["google", "zerossl", "sslcom", "litessl"].includes(this.caType);
    if (needEab && (!this.eabKid || !this.eabHmacKey)) {
      throw new Error("该颁发机构需要填写EAB KID和EAB HMAC Key后才能生成账号");
    }
    const account = await this.createAccountInfo();
    return JSON.stringify(account);
  }

  private async createAccountInfo(): Promise<AcmeAccountInfo> {
    const directoryUrl = this.getDirectoryUrl();
    const externalAccountBinding = this.eabKid && this.eabHmacKey ? { kid: this.eabKid, hmacKey: this.eabHmacKey } : undefined;
    const memoryStore = new Map<string, any>();
    const userContext = {
      async getObj(key: string) {
        return memoryStore.get(key);
      },
      async setObj(key: string, value: any) {
        memoryStore.set(key, value);
      },
    };
    const acmeService = new AcmeService({
      userId: 0,
      userContext: userContext as any,
      logger: (this.ctx?.logger || console) as any,
      sslProvider: this.caType as any,
      eab: externalAccountBinding ? ({ ...externalAccountBinding, id: 0 } as any) : undefined,
      privateKeyType: "rsa_2048",
      signal: (this.ctx as any)?.signal,
      maxCheckRetryCount: 20,
      domainParser: {} as any,
    });
    const client = await acmeService.getAcmeClient(this.email);
    const conf = await userContext.getObj(acmeService.buildAccountKey(this.email));
    if (!conf?.key || !client.getAccountUrl()) {
      throw new Error("ACME账号生成失败，请稍后重试");
    }
    const account: AcmeAccountInfo = {
      accountKey: conf.key,
      accountUri: client.getAccountUrl(),
      caType: this.caType,
      email: this.email,
      directoryUrl,
    };
    if (externalAccountBinding) {
      account.eab = {
        ...externalAccountBinding,
        usedAt: Date.now(),
      };
    }
    return account;
  }

  getAccount(): AcmeAccountInfo {
    const account = parseAccount(this.account);
    if (!account?.accountKey || !account?.accountUri) {
      throw new Error("ACME账号信息无效，请重新生成ACME账号");
    }
    return account;
  }
}

new AcmeAccountAccess();
