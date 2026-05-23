import { logger } from "@certd/basic";
import { AccessService } from "@certd/lib-server";
import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { Like } from "typeorm";
import { StorageService } from "../../pipeline/service/storage-service.js";
import { parseStorageValue } from "./google-common-eab-account-key-fix.js";

export type LegacyAcmeAccountConfig = {
  key?: string;
  privateKey?: string;
  accountKey?: string;
  accountUrl?: string;
  accountUri?: string;
};

export function parseLegacyAcmeStorageKey(key: string) {
  const match = /^acme\.config\.([^.]+)\.(.+)$/.exec(key);
  if (!match) {
    return null;
  }
  if (match[2].startsWith("access.")) {
    return null;
  }
  return {
    caType: match[1],
    email: match[2],
  };
}

export function buildAcmeAccountSetting(req: { caType: string; email: string; config: LegacyAcmeAccountConfig }) {
  const accountKey = req.config.privateKey || req.config.key || req.config.accountKey;
  const accountUri = req.config.accountUri || req.config.accountUrl;
  if (!accountKey || !accountUri) {
    return null;
  }
  return {
    caType: req.caType,
    email: req.email,
    account: JSON.stringify({
      accountKey,
      accountUri,
      caType: req.caType,
      email: req.email,
      directoryUrl: "",
      migratedFrom: "legacy-storage",
    }),
  };
}

export function maskAcmeAccountEmail(email: string) {
  if (!email) {
    return "unknown";
  }
  const atIndex = email.indexOf("@");
  if (atIndex < 0) {
    return email.length <= 2 ? `${email[0] || ""}*******` : `${email.substring(0, 2)}*******`;
  }
  const name = email.substring(0, atIndex);
  const domain = email.substring(atIndex + 1);
  const prefix = name.substring(0, Math.min(2, name.length));
  return `${prefix}*******${domain}`;
}

export function buildAcmeAccountAccessName(caType: string, email: string) {
  return `${caType}-acme-${maskAcmeAccountEmail(email)}`;
}

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class LegacyAcmeAccountAccessFix {
  @Inject()
  storageService: StorageService;

  @Inject()
  accessService: AccessService;

  
  async init() {
    try {
      const repository = this.storageService.getRepository();
      const records = await repository.find({
        where: {
          scope: "user",
          key: Like("acme.config.%"),
        },
      });
      let count = 0;
      for (const record of records) {
        const parsedKey = parseLegacyAcmeStorageKey(record.key);
        if (!parsedKey) {
          continue;
        }
        const config = parseStorageValue(record.value) as LegacyAcmeAccountConfig;
        const setting = buildAcmeAccountSetting({
          ...parsedKey,
          config,
        });
        if (!setting) {
          continue;
        }
        const name = buildAcmeAccountAccessName(parsedKey.caType, parsedKey.email);
        const exists = await this.accessService.findOne({
          where: {
            userId: record.userId,
            projectId: record.projectId,
            type: "acmeAccount",
            subtype: parsedKey.caType,
            name,
          } as any,
        });
        if (exists) {
          continue;
        }
        await this.accessService.add({
          userId: record.userId,
          projectId: record.projectId,
          type: "acmeAccount",
          subtype: parsedKey.caType,
          name,
          setting: JSON.stringify(setting),
        });
        count++;
      }
      logger.info(`旧ACME账号迁移完成，生成${count}个ACME账号授权`);
      return true;
    } catch (e: any) {
      logger.error("旧ACME账号迁移失败", e);
      return false;
    }
  }
}
