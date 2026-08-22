import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";
import * as acme from "@certd/acme-client";
import { CustomAcmeProvider } from "@certd/lib-server";
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
      name: "remote-select",
      vModel: "value",
      type: "access",
      typeName: "acmeAccount",
      action: "onCaTypeList",
      single: true,
    },
    required: true,
    helper: "自定义ACME：适用于内网CA、企业CA等，由管理员在「系统设置-流水线设置」中配置",
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
      placeholder: "https://your-ca.example.com/directory",
    },
    helper: "旧版自定义ACME使用，现已由系统「流水线设置」中的自定义ACME配置管理",
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
    required: true,
    encrypt: true,
    mergeScript: `
    return {
      show: ctx.compute(({form})=>{
        const caType = form.access?.caType;
        // 内置颁发机构按 needEAB 配置显隐；自定义ACME显示EAB（选填）
        const builtInNeedEab = { letsencrypt: false, letsencrypt_staging: false, google: true, zerossl: true, sslcom: true, litessl: true };
        if (caType && builtInNeedEab[caType] !== undefined) {
          return builtInNeedEab[caType];
        }
        return !!caType;
      }),
      required: ctx.compute(({form})=>{
        const caType = form.access?.caType;
        // 内置需要EAB的颁发机构必填，自定义ACME选填
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
    required: true,
    encrypt: true,
    mergeScript: `
    return {
      show: ctx.compute(({form})=>{
        const caType = form.access?.caType;
        // 内置颁发机构按 needEAB 配置显隐；自定义ACME显示EAB（选填）
        const builtInNeedEab = { letsencrypt: false, letsencrypt_staging: false, google: true, zerossl: true, sslcom: true, litessl: true };
        if (caType && builtInNeedEab[caType] !== undefined) {
          return builtInNeedEab[caType];
        }
        return !!caType;
      }),
      required: ctx.compute(({form})=>{
        const caType = form.access?.caType;
        // 内置需要EAB的颁发机构必填，自定义ACME选填
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
    title: "生成ACME账号",
    component: {
      name: "refresh-input",
      action: "GenerateAccount",
      buttonText: "生成ACME账号",
      successMessage: "ACME账号已生成，请保存授权配置",
      type: "textarea",
      rows: 4,
    },
    col: { span: 24 },
    required: true,
    helper: "请点击右边按钮生成ACME账号，账号一旦生成不允许修改",
    encrypt: true,
    mergeScript: `
    return {
      component: {
        disabled: ctx.compute(({form})=> !!form.access?.account && !form.access?.editAccount)
      }
    }
    `,
  })
  account = "";

  @AccessInput({
    title: "修改ACME账号",
    component: {
      name: "a-switch",
      vModel: "checked",
    },
    required: false,
    helper: "是否开启修改ACME账号，注意，开启后，会影响DNS持久验证记录",
    encrypt: false,
  })
  editAccount = false;

  /**
   * 获取当前颁发机构在系统「流水线设置」中的配置（内置 + 自定义）；旧版 custom 不在此配置中，返回 undefined
   */
  private async getProvider(): Promise<CustomAcmeProvider | undefined> {
    if (this.caType === "custom") {
      return undefined;
    }
    const customAcmeProviderService: any = await this.ctx?.serviceGetter?.get("customAcmeProviderService");
    return customAcmeProviderService ? await customAcmeProviderService.getBySslProvider(this.caType) : undefined;
  }

  /**
   * 获取颁发机构对应的 ACME Directory URL：
   * - custom：旧版自定义ACME（入口已隐藏，兼容历史数据），使用本配置填写的 directoryUrl
   * - 内置颁发机构（builtIn=true）：使用内置端点
   * - 自定义ACME：按 sslProvider 从「流水线设置」读取 directoryUrl
   */
  async getDirectoryUrl() {
    if (this.caType === "custom") {
      if (!this.directoryUrl) {
        throw new Error("自定义ACME需要填写Directory URL");
      }
      return this.directoryUrl;
    }
    const provider = await this.getProvider();
    if (provider?.builtIn) {
      return acme.getDirectoryUrl({ sslProvider: this.caType, pkType: "rsa_2048" });
    }
    if (provider?.directoryUrl) {
      return provider.directoryUrl;
    }
    // 未查到配置（内置项默认配置缺失或 service 不可用）时，尝试内置端点；非内置则报错
    try {
      return acme.getDirectoryUrl({ sslProvider: this.caType, pkType: "rsa_2048" });
    } catch {
      // 非内置颁发机构，继续走下面的明确报错
    }
    throw new Error(`未找到颁发机构【${this.caType}】的配置，请到「系统设置-流水线设置」中检查`);
  }

  /**
   * 颁发机构下拉选项（remote-select action）：系统「流水线设置」中的全部颁发机构（内置 + 自定义ACME）
   */
  async onCaTypeList() {
    const customAcmeProviderService: any = await this.ctx?.serviceGetter?.get("customAcmeProviderService");
    if (!customAcmeProviderService) {
      return [];
    }
    const providers = (await customAcmeProviderService.getAll()) || [];
    return providers
      .filter(provider => provider.sslProvider && provider.title)
      .map(provider => ({
        value: provider.sslProvider,
        label: provider.builtIn ? provider.title : `${provider.title}（自定义ACME）`,
        needEAB: provider.needEAB === true,
      }));
  }

  async onGenerateAccount() {
    if (!this.caType) {
      throw new Error("请先选择颁发机构");
    }
    if (!this.email) {
      throw new Error("请先填写邮箱");
    }
    // 是否需要EAB按系统「流水线设置」中该颁发机构的 needEAB 配置决定
    const provider = await this.getProvider();
    const needEab = provider?.needEAB === true;
    if (needEab && (!this.eabKid || !this.eabHmacKey)) {
      throw new Error("该颁发机构需要填写EAB KID和EAB HMAC Key后才能生成账号");
    }
    const account = await this.createAccountInfo();
    return JSON.stringify(account, null, 2);
  }

  private async createAccountInfo(): Promise<AcmeAccountInfo> {
    const directoryUrl = await this.getDirectoryUrl();
    const provider = await this.getProvider();
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
      // 自定义ACME时把 Directory URL 传给 AcmeService（生成账号必须走自定义端点）；内置颁发机构走内置端点
      directoryUrl: provider?.builtIn ? undefined : directoryUrl,
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
