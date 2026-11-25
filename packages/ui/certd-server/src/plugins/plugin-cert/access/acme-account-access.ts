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
  issuer?: string;
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
  const parsed = typeof account === "string" ? JSON.parse(account) : account;
  if (!parsed.issuer) {
    parsed.issuer = acme.getDnsPersistIssuer(parsed.directoryUrl);
  }
  return parsed;
}

@IsAccess({
  name: "acmeAccount",
  title: "ACME账号",
  desc: "用于复用ACME账号私钥和账号地址，证书申请时不再临时创建账号",
  i18n: {
    "en-US": {
      title: "ACME Account",
      desc: "Reuse an ACME account key and account URL instead of creating a temporary account for each certificate request.",
      input: {
        caType: { title: "Certificate Authority" },
        email: { title: "Email", helper: "Enter a valid email address." },
        directoryUrl: { title: "ACME Directory URL", helper: "For legacy custom ACME only. Manage custom ACME providers in Pipeline Settings." },
        eabKid: {
          title: "EAB KID",
          component: { placeholder: "Required when creating an account with a CA that requires EAB" },
          helper:
            "EAB credentials are required by some CAs.\nZeroSSL: Generate EAB credentials in the [ZeroSSL Developer Center](https://app.zerossl.com/developer).\nGoogle: See the [Google EAB guide](https://certd.docmirror.cn/guide/use/google/).\nSSL.com: Open Account > API Credentials and view the Secret Key and HMAC Key.\nlitessl: Create an EAB on the [litessl EAB page](https://freessl.cn/automation/eab-manager).\nLocal CA: enable ACME for an intermediate CA and create an EAB credential in Local CA Management. Quick-add the custom ACME provider in System Settings > Pipeline Settings (copy the Directory URL from the CA details), then fill in this credential's KID and HMAC Key.",
        },
        eabHmacKey: { title: "EAB HMAC Key", component: { placeholder: "Required when creating an account with a CA that requires EAB" } },
        account: {
          title: "Generate ACME Account",
          component: { buttonText: "Generate ACME Account", successMessage: "ACME account generated. Save this access configuration." },
          helper: "Click the button on the right to generate an ACME account. A generated account cannot be changed.",
        },
        editAccount: { title: "Edit ACME Account", helper: "Allow editing the ACME account. This may affect DNS persistent validation records." },
      },
    },
  },
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
      mode: "tags",
      emitImmediate: true,
    },
    required: true,
    mergeScript: `
    return {
      component: {
        disabled: ctx.compute(({form})=> !!form.access?.account),
        on: {
          "selected-change": (scope)=>{
            // 把选中颁发机构的 needEAB 同步到表单隐藏字段，用于控制 EAB 输入框显隐
            let form = scope.form || {};
            form.access._needEAB = scope.$event?.needEAB
          }
        }
      },
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
        disabled: ctx.compute(({form})=> !!form.access?.account && !form.access?.editAccount)
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
      "\nGoogle:请查看[google获取eab帮助文档](https://certd.docmirror.cn/guide/use/google/),需要你去翻墙得到EAB填到这里" +
      "\nSSL.com:[SSL.com账号页面](https://secure.ssl.com/account),然后点击api credentials链接，然后点击编辑按钮，查看Secret key和HMAC key" +
      "\nlitessl:[litesslEAB页面](https://freessl.cn/automation/eab-manager),然后点击新增EAB" +
      "\n本地CA：请先在「本地CA管理」中为中间CA开启ACME并创建EAB凭证；再到「系统设置-流水线设置」快速添加自定义ACME（Directory URL 从CA详情复制），最后把凭证的 KID 和 HMAC Key 填到这里生成账号。",
    required: true,
    encrypt: true,
    mergeScript: `
    return {
      show: ctx.compute(({form})=>{
        // 按所选颁发机构的 needEAB 配置显隐（由 caType 的 onSelectedChange 同步到 _needEAB）
        return form.access?._needEAB === true;
      }),
      component: {
        disabled: ctx.compute(({form})=> !!form.access?.account && !form.access?.editAccount)
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
        // 按所选颁发机构的 needEAB 配置显隐（由 caType 的 onSelectedChange 同步到 _needEAB）
        return form.access?._needEAB === true;
      }),
      component: {
        disabled: ctx.compute(({form})=> !!form.access?.account && !form.access?.editAccount)
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
    if (!this.caType) {
      throw new Error("请先选择颁发机构");
    }
    if (this.caType === "custom") {
      if (!this.directoryUrl) {
        throw new Error("自定义ACME需要填写Directory URL");
      }
      return this.directoryUrl;
    }
    const provider = await this.getProvider();
    // 软停用的颁发机构拒绝生成/刷新账号（配置保留，运行时同样拒绝）
    if (provider?.enabled === false) {
      throw new Error(`颁发机构【${provider.title || this.caType}】已停用，请到「系统设置-流水线设置」中启用后再生成账号`);
    }
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
    // 本地CA同步条目仅展示当前用户有权使用的CA，避免向未授权用户暴露内部颁发机构
    let localAllowed: Set<number> | null = null;
    try {
      const getter: any = await this.ctx?.serviceGetter?.get("localCaGetter");
      const usable = (await getter?.listOptions?.()) || [];
      localAllowed = new Set(usable.map((item: any) => Number(item.id)));
    } catch {
      localAllowed = new Set();
    }
    return providers
      .filter(provider => {
        if (!provider.sslProvider || !provider.title || provider.enabled === false) {
          return false;
        }
        if (String(provider.sslProvider).startsWith("local-ca-")) {
          return localAllowed.has(Number(provider.localCaId));
        }
        return true;
      })
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
      throw new Error("该颁发机构要求填写EAB KID与EAB HMAC Key后方可生成账号");
    }
    const account = await this.createAccountInfo();
    return JSON.stringify(account, null, 2);
  }

  private async createAccountInfo(): Promise<AcmeAccountInfo> {
    const directoryUrl = await this.getDirectoryUrl();
    const provider = await this.getProvider();
    const externalAccountBinding = this.eabKid && this.eabHmacKey ? { kid: this.eabKid, hmacKey: this.eabHmacKey } : undefined;
    // 仅本地档的本地CA颁发机构：账号生成是Certd自身的管理操作，携带内部凭证通过门禁
    let extraHeaders: Record<string, string> | undefined;
    if (String(this.caType || "").startsWith("local-ca-")) {
      try {
        const getter: any = await this.ctx?.serviceGetter?.get("localCaGetter");
        const caId = Number(String(this.caType).slice("local-ca-".length));
        const ca = await getter?.getCa?.(caId);
        if (ca?.localAcmeToken) {
          extraHeaders = { "x-certd-acme-token": ca.localAcmeToken };
        }
      } catch {
        // 无凭证时按普通请求处理，由服务端门禁裁决
      }
    }
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
      // 自定义ACME配置的反向代理地址，生成账号（访问directory/newAccount）时同样使用
      reverseProxy: provider?.reverseProxy,
      eab: externalAccountBinding ? ({ ...externalAccountBinding, id: 0 } as any) : undefined,
      privateKeyType: "rsa_2048",
      signal: (this.ctx as any)?.signal,
      maxCheckRetryCount: 6,
      domainParser: {} as any,
      extraHeaders,
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
      issuer: acme.getDnsPersistIssuer(directoryUrl),
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
