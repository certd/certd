import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { logger } from "@certd/basic";
import { AccessService, AddonEntity, SysSettingsService } from "@certd/lib-server";
import { isComm } from "@certd/plus-core";
import { PluginConfigService } from "../plugin/service/plugin-config-service.js";
import { StorageService } from "../pipeline/service/storage-service.js";
import { OauthBoundService } from "../login/service/oauth-bound-service.js";
import { OauthBoundEntity } from "../login/entity/oauth-bound.js";

export function parseStorageValue(value?: string) {
  if (!value) {
    return null;
  }
  try {
    const parsed = JSON.parse(value);
    return parsed?.value || null;
  } catch {
    return null;
  }
}

export function buildEabAccountKeyValue(kid: string, privateKey: string) {
  return JSON.stringify({
    kid,
    privateKey,
  });
}

export function buildLegacyGoogleAccountConfigWhere(email: string) {
  return {
    userId: 1,
    scope: "user",
    namespace: "1",
    key: `acme.config.google.${email}`,
  };
}

export function buildOauthBoundType(type: string, subtype?: string) {
  return subtype ? `${type}:${subtype}` : type;
}

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class AutoFix {
  @Inject()
  pluginConfigService: PluginConfigService;

  @Inject()
  accessService: AccessService;

  @Inject()
  storageService: StorageService;

  @Inject()
  sysSettingsService: SysSettingsService;

  @Inject()
  oauthBoundService: OauthBoundService;

  async init() {
    await this.fixGoogleCommonEabAccountKey();
    await this.fixOauthSubtypeBoundType();
  }

  async fixOauthSubtypeBoundType() {
    try {
      const publicSettings = await this.sysSettingsService.getPublicSettings();
      const oauthProviders = publicSettings.oauthProviders || {};
      await this.oauthBoundService.transaction(async manager => {
        for (const [type, provider] of Object.entries(oauthProviders)) {
          if (!provider.addonId) {
            continue;
          }

          const addonEntity = await manager.findOne(AddonEntity, { where: { id: provider.addonId } });
          const legacyLoginType = this.getLegacyAddonLoginType(addonEntity?.setting);
          if (!legacyLoginType) {
            continue;
          }

          const newType = buildOauthBoundType(type, legacyLoginType);
          const res = await manager.update(OauthBoundEntity, { type }, { type: newType });
          if (res.affected) {
            logger.info(`已修复OAuth绑定历史数据，${type} -> ${newType}，数量=${res.affected}`);
          }
          await this.convertLegacyAddonLoginTypeToArray(addonEntity, legacyLoginType, manager);
        }
      });
    } catch (e: any) {
      logger.error("修复OAuth subtype绑定历史数据失败", e);
    }
  }

  private getLegacyAddonLoginType(settingValue?: string) {
    if (!settingValue) {
      return null;
    }
    const setting = JSON.parse(settingValue);
    return typeof setting.loginType === "string" && setting.loginType ? setting.loginType : null;
  }

  private async convertLegacyAddonLoginTypeToArray(addonEntity: AddonEntity | null, loginType: string, manager: any) {
    if (!addonEntity?.setting) {
      return;
    }
    const setting = JSON.parse(addonEntity.setting);
    if (typeof setting.loginType !== "string") {
      return;
    }
    setting.loginType = [loginType];
    await manager.update(AddonEntity, { id: addonEntity.id }, { setting: JSON.stringify(setting) });
  }

  async fixGoogleCommonEabAccountKey() {
    if (!isComm()) {
      return;
    }
    try {
      const certApplyConfig = await this.pluginConfigService.getPluginConfig({
        name: "CertApply",
        type: "builtIn",
      });
      const googleCommonEabAccessId = certApplyConfig?.sysSetting?.input?.googleCommonEabAccessId;
      if (!googleCommonEabAccessId) {
        return;
      }

      const eabAccess = await this.accessService.getAccessById(googleCommonEabAccessId, false);
      if (eabAccess.accountKey) {
        return;
      }
      if (!eabAccess.kid) {
        logger.info("公共Google EAB授权缺少KID，跳过历史ACME账号私钥修复");
        return;
      }

      const accountConfig = await this.getLegacyGoogleAccountConfig(eabAccess.email);
      const privateKey = accountConfig?.privateKey || accountConfig?.key || accountConfig?.accountKey;
      if (!privateKey) {
        logger.info("未找到可迁移到公共Google EAB授权的历史ACME账号私钥");
        return;
      }

      const accountKey = buildEabAccountKeyValue(eabAccess.kid, privateKey);
      await this.accessService.updateAccess({ id: googleCommonEabAccessId, eabType: "google", accountKey });
      logger.info(`已修复公共Google EAB授权的ACME账号私钥，accessId=${googleCommonEabAccessId}`);
    } catch (e: any) {
      logger.error("修复公共Google EAB授权ACME账号私钥失败", e);
    }
  }

  async getLegacyGoogleAccountConfig(email?: string) {
    if (!email) {
      return null;
    }
    const repository = this.storageService.getRepository();
    const exact = await repository.findOne({
      where: buildLegacyGoogleAccountConfigWhere(email),
    });
    const exactValue = this.parseStorageValue(exact?.value);
    if (exactValue?.key || exactValue?.privateKey || exactValue?.accountKey) {
      return exactValue;
    }
    return null;
  }
  
  parseStorageValue(value?: string) {
    return parseStorageValue(value);
  }
}
