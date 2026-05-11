import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { logger } from "@certd/basic";
import { AccessService } from "@certd/lib-server";
import { isComm } from "@certd/plus-core";
import { PluginConfigService } from "../plugin/service/plugin-config-service.js";
import { StorageService } from "../pipeline/service/storage-service.js";

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

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class AutoFix {
  @Inject()
  pluginConfigService: PluginConfigService;

  @Inject()
  accessService: AccessService;

  @Inject()
  storageService: StorageService;

  async init() {
    await this.fixGoogleCommonEabAccountKey();
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
