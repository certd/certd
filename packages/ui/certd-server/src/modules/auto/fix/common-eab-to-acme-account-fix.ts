import { logger } from "@certd/basic";
import { AccessService } from "@certd/lib-server";
import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { PluginConfigService } from "../../plugin/service/plugin-config-service.js";
import { StorageService } from "../../pipeline/service/storage-service.js";
import { AcmeService } from "../../../plugins/plugin-cert/plugin/cert-plugin/acme.js";
import { buildAcmeAccountSetting, LegacyAcmeAccountConfig } from "./legacy-acme-account-access-fix.js";
import { parseStorageValue } from "./google-common-eab-account-key-fix.js";

const COMMON_EAB_TO_ACME_ACCOUNT_FIELDS = [
  {
    caType: "google",
    eabField: "googleCommonEabAccessId",
    acmeField: "googleCommonAcmeAccountAccessId",
  },
  {
    caType: "zerossl",
    eabField: "zerosslCommonEabAccessId",
    acmeField: "zerosslCommonAcmeAccountAccessId",
  },
  {
    caType: "sslcom",
    eabField: "sslcomCommonEabAccessId",
    acmeField: "sslcomCommonAcmeAccountAccessId",
  },
  {
    caType: "litessl",
    eabField: "litesslCommonEabAccessId",
    acmeField: "litesslCommonAcmeAccountAccessId",
  },
];

export function parseEabAccountKey(accountKey?: string) {
  if (!accountKey) {
    return null;
  }
  try {
    const parsed = JSON.parse(accountKey);
    return parsed?.privateKey || parsed?.accountKey || parsed?.key || accountKey;
  } catch {
    return accountKey;
  }
}

export function buildLegacyCommonEabAccountStorageWhere(caType: string, accessId: number) {
  return {
    userId: 0,
    scope: "user",
    namespace: "0",
    key: `acme.config.${caType}.access.${accessId}`,
  };
}

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class CommonEabToAcmeAccountFix {
  @Inject()
  pluginConfigService: PluginConfigService;

  @Inject()
  accessService: AccessService;

  @Inject()
  storageService: StorageService;

  async init() {
    try {
      const certApplyConfig = await this.pluginConfigService.getPluginConfig({
        name: "CertApply",
        type: "builtIn",
      });
      const input = certApplyConfig.sysSetting.input || {};
      let changed = false;
      for (const item of COMMON_EAB_TO_ACME_ACCOUNT_FIELDS) {
        if (input[item.acmeField]) {
          continue;
        }
        const eabAccessId = input[item.eabField];
        if (!eabAccessId) {
          continue;
        }
        const acmeAccessId = await this.createCommonAcmeAccountFromEab(item.caType, eabAccessId);
        if (acmeAccessId) {
          input[item.acmeField] = acmeAccessId;
          changed = true;
        }
      }
      if (changed) {
        await this.pluginConfigService.savePluginConfig({
          name: "CertApply",
          disabled: certApplyConfig.disabled,
          sysSetting: {
            ...certApplyConfig.sysSetting,
            input,
          },
        });
      }
      return true;
    } catch (e: any) {
      logger.error("公共EAB迁移为公共ACME账号失败", e);
      return false;
    }
  }

  async createCommonAcmeAccountFromEab(caType: string, eabAccessId: number) {
    const eabAccess = await this.accessService.getAccessById(eabAccessId, false);
    const privateKey = parseEabAccountKey(eabAccess.accountKey);
    const accountConfig = await this.getLegacyCommonEabAccountConfig(caType, eabAccessId);
    const accountUri = await this.resolveAccountUriByPrivateKey(caType, eabAccess, accountConfig?.accountUri || accountConfig?.accountUrl);
    if (!privateKey || !accountUri) {
      logger.info(`公共${caType} EAB缺少可迁移的accountKey或无法获取accountUri，跳过生成公共ACME账号`);
      return null;
    }
    const email = eabAccess.email || `${caType}@common.certd.local`;
    const exists = await this.accessService.findOne({
      where: {
        userId: 0,
        projectId: null,
        type: "acmeAccount",
        subtype: caType,
        name: `公共${caType} ACME账号`,
      } as any,
    });
    if (exists) {
      return exists.id;
    }
    const setting = buildAcmeAccountSetting({
      caType,
      email,
      config: {
        privateKey,
        accountUri,
      },
    });
    const { id } = await this.accessService.add({
      userId: 0,
      projectId: null,
      type: "acmeAccount",
      name: `公共${caType} ACME账号`,
      setting: JSON.stringify(setting),
    });
    logger.info(`已根据公共${caType} EAB生成公共ACME账号，accessId=${id}`);
    return id;
  }

  async resolveAccountUriByPrivateKey(caType: string, eabAccess: any, accountUri?: string | null) {
    if (accountUri) {
      return accountUri;
    }
    const privateKey = parseEabAccountKey(eabAccess.accountKey);
    if (!privateKey || !eabAccess?.kid) {
      return null;
    }
    const acmeService = new AcmeService({
      userId: 0,
      userContext: {
        async getObj() {
          return null;
        },
        async setObj() {},
      } as any,
      logger: logger as any,
      sslProvider: caType as any,
      eab: {
        id: eabAccess.id || eabAccess.accessId || eabAccess.eabAccessId || 0,
        kid: eabAccess.kid,
        hmacKey: eabAccess.hmacKey,
        accountKey: JSON.stringify({
          kid: eabAccess.kid,
          privateKey,
        }),
      } as any,
      domainParser: {} as any,
      privateKeyType: "rsa_2048",
    });
    const client = await acmeService.getAcmeClient(eabAccess.email || `${caType}@common.certd.local`);
    return client.getAccountUrl() || null;
  }

  async getLegacyCommonEabAccountConfig(caType: string, accessId: number): Promise<LegacyAcmeAccountConfig | null> {
    const repository = this.storageService.getRepository();
    const record = await repository.findOne({
      where: buildLegacyCommonEabAccountStorageWhere(caType, accessId),
    });
    return parseStorageValue(record?.value) as LegacyAcmeAccountConfig;
  }
}
