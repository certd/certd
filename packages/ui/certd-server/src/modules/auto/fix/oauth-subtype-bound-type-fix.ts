import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { logger } from "@certd/basic";
import { AddonEntity, SysSettingsService } from "@certd/lib-server";
import { OauthBoundService } from "../../login/service/oauth-bound-service.js";
import { OauthBoundEntity } from "../../login/entity/oauth-bound.js";

export function buildOauthBoundType(type: string, subtype?: string) {
  return subtype ? `${type}:${subtype}` : type;
}

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class OauthSubtypeBoundTypeFix {
  @Inject()
  sysSettingsService: SysSettingsService;

  @Inject()
  oauthBoundService: OauthBoundService;

  async init() {
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
      return true;
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
}
