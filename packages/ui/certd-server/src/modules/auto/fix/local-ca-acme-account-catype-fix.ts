import { logger } from "@certd/basic";
import { AccessEntity, EncryptService } from "@certd/lib-server";
import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { Repository } from "typeorm";
import { parseLocalCaDirectory } from "../../local-ca/service/local-ca-directory.js";

/**
 * 一次性迁移：legacy 本地CA ACME账号 caType='custom' → 'local-ca-<caId>'，
 * 使其在本地ACME任务按颁发机构(subtype)过滤账号时可见。仅改 subtype 与明文 setting.caType，
 * 不动加密的 account 内容（运行时按 directoryUrl 解析CA，保持兼容）。
 */
@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class LocalCaAcmeAccountCaTypeFix {
  @InjectEntityModel(AccessEntity)
  repository: Repository<AccessEntity>;

  @Inject()
  encryptService: EncryptService;

  async init() {
    try {
      const rows = await this.repository.find({ where: { type: "acmeAccount", subtype: "custom" } });
      let changed = 0;
      for (const row of rows) {
        try {
          const enc = JSON.parse(row.encryptSetting || "{}");
          const accountEnc = enc?.account?.value;
          if (!accountEnc || enc?.account?.encrypt !== true) {
            continue;
          }
          const account = JSON.parse(this.encryptService.decrypt(accountEnc));
          const caId = parseLocalCaDirectory(account?.directoryUrl || "")?.caId;
          if (!caId) {
            continue;
          }
          const sslProvider = `local-ca-${caId}`;
          const setting = JSON.parse(row.setting || "{}");
          setting.caType = sslProvider;
          await this.repository.update({ id: row.id }, { subtype: sslProvider, setting: JSON.stringify(setting) } as any);
          changed++;
        } catch (e: any) {
          logger.warn(`[local-ca] account caType migrate skip access=${row.id}: ${e?.message || e}`);
        }
      }
      if (changed) {
        logger.info(`[local-ca] migrated ${changed} legacy ACME accounts caType to local-ca-N`);
      }
      return true;
    } catch (e: any) {
      logger.error(`[local-ca] account caType migrate failed: ${e?.message || e}`);
      return false;
    }
  }
}