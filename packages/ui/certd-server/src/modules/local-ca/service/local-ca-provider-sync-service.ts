import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { Repository } from "typeorm";
import { logger } from "@certd/basic";
import { SysSettingsService } from "@certd/lib-server";
import { LocalCaEntity } from "../entity/local-ca.js";
import { LocalCaCrlService } from "./local-ca-crl-service.js";
import { parseLocalCaDirectory } from "./local-ca-directory.js";

/**
 * 本地中间CA ↔ 系统「自定义ACME颁发机构」自动同步。
 * 启用ACME的中间CA自动同步为 sslProvider=local-ca-<id> 的颁发机构条目（带 localCaId 标记），
 * 禁用/吊销/归档/轮换时同步更新或移除。仅操作带 localCaId 标记（或 local-ca-N 命名）的条目，
 * 整组替换 customAcmeProviders 数组（避免 lodash merge 按下标合并损坏无关条目）。
 */
@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class LocalCaProviderSyncService {
  @InjectEntityModel(LocalCaEntity)
  repository: Repository<LocalCaEntity>;

  @Inject()
  sysSettingsService: SysSettingsService;

  @Inject()
  crlService: LocalCaCrlService;

  private isSyncedEntry(provider: any, caId?: number): boolean {
    if (provider?.localCaId != null) {
      return caId == null || Number(provider.localCaId) === Number(caId);
    }
    // 兼容无标记的 legacy quick-add 条目（sslProvider=local-ca-N）
    const parsed = parseLocalCaDirectory(provider?.directoryUrl || "");
    if (parsed && provider?.sslProvider === `local-ca-${parsed.caId}`) {
      return caId == null || Number(parsed.caId) === Number(caId);
    }
    return false;
  }

  private async buildEntry(ca: LocalCaEntity, existing?: any) {
    const baseUrl = String((await this.crlService.resolveBaseUrl(ca)) || "").replace(/\/+$/, "");
    return {
      ...(existing || {}),
      sslProvider: existing?.sslProvider || `local-ca-${ca.id}`,
      title: ca.name,
      directoryUrl: `${baseUrl}/api/acme/${ca.id}/directory`,
      needEAB: true,
      builtIn: false,
      reverseProxy: existing?.reverseProxy || "",
      localCaId: ca.id,
      enabled: existing?.enabled ?? true,
    };
  }

  private usable(ca: LocalCaEntity | null): boolean {
    return !!ca && ca.caType === "intermediate" && ca.acmeEnabled === true && !ca.disabled && !ca.revoked && !ca.rotatedToId && !ca.deleted && (!ca.notAfter || Number(ca.notAfter) > Date.now());
  }

  /** 按CA当前状态 upsert 或移除其同步条目。 */
  async syncForCa(caId: number) {
    const ca = await this.repository.findOne({ where: { id: caId } });
    const privateSetting = await this.sysSettingsService.getPrivateSettings();
    const providers = [...(privateSetting.customAcmeProviders || [])];
    const idx = providers.findIndex(item => this.isSyncedEntry(item, caId));
    const existing = idx >= 0 ? providers[idx] : undefined;
    let changed = false;
    if (this.usable(ca)) {
      const baseUrl = String((await this.crlService.resolveBaseUrl(ca)) || "").replace(/\/+$/, "");
      if (!baseUrl) {
        return;
      }
      const entry = await this.buildEntry(ca, existing);
      if (idx >= 0) {
        if (JSON.stringify(providers[idx]) !== JSON.stringify(entry)) {
          providers[idx] = entry;
          changed = true;
        }
      } else {
        providers.push(entry);
        changed = true;
      }
    } else if (idx >= 0) {
      providers.splice(idx, 1);
      changed = true;
    }
    if (changed) {
      privateSetting.customAcmeProviders = providers;
      await this.sysSettingsService.savePrivateSettings(privateSetting);
      logger.info(`[local-ca] provider synced ca=${caId} usable=${this.usable(ca)}`);
    }
  }

  async removeForCa(caId: number) {
    const privateSetting = await this.sysSettingsService.getPrivateSettings();
    const providers = (privateSetting.customAcmeProviders || []).filter(item => !this.isSyncedEntry(item, caId));
    if (providers.length !== (privateSetting.customAcmeProviders || []).length) {
      privateSetting.customAcmeProviders = providers;
      await this.sysSettingsService.savePrivateSettings(privateSetting);
      logger.info(`[local-ca] provider removed ca=${caId}`);
    }
  }

  /** 轮换：稳定 sslProvider  lineage 键，更新 localCaId/title/directoryUrl 指向新CA，保留 enabled/reverseProxy。 */
  async onRotated(oldId: number, newId: number) {
    const newCa = await this.repository.findOne({ where: { id: newId } });
    const privateSetting = await this.sysSettingsService.getPrivateSettings();
    const providers = [...(privateSetting.customAcmeProviders || [])];
    const idx = providers.findIndex(item => this.isSyncedEntry(item, oldId));
    let changed = false;
    if (idx >= 0 && newCa) {
      const existing = providers[idx];
      const entry = await this.buildEntry(newCa, { ...existing, sslProvider: existing.sslProvider });
      entry.localCaId = newId;
      providers[idx] = entry;
      changed = true;
    }
    if (changed) {
      privateSetting.customAcmeProviders = providers;
      await this.sysSettingsService.savePrivateSettings(privateSetting);
      logger.info(`[local-ca] provider rotated ${oldId}->${newId}`);
    }
    // 新CA若启用ACME但无条目（旧CA曾关ACME），补建
    await this.syncForCa(newId);
  }

  /** 启动对账：按全部CA状态重建同步条目集合，清理孤儿。 */
  async reconcileAll() {
    const cas = await this.repository.find({ where: { deleted: false } });
    const privateSetting = await this.sysSettingsService.getPrivateSettings();
    const kept = (privateSetting.customAcmeProviders || []).filter(item => !this.isSyncedEntry(item));
    const synced: any[] = [];
    for (const ca of cas) {
      if (this.usable(ca)) {
        const baseUrl = String((await this.crlService.resolveBaseUrl(ca)) || "").replace(/\/+$/, "");
        if (baseUrl) {
          const existing = (privateSetting.customAcmeProviders || []).find(item => this.isSyncedEntry(item, ca.id));
          synced.push(await this.buildEntry(ca, existing));
        }
      }
    }
    const next = [...kept, ...synced];
    if (JSON.stringify(next) !== JSON.stringify(privateSetting.customAcmeProviders || [])) {
      privateSetting.customAcmeProviders = next;
      await this.sysSettingsService.savePrivateSettings(privateSetting);
      logger.info(`[local-ca] provider reconciled count=${synced.length}`);
    }
  }
}