import { Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { BaseService, PageReq } from "@certd/lib-server";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { Repository } from "typeorm";
import { ClientEntity } from "../entity/client.js";

export type ClientHeartbeatReq = {
  clientId: string;
  machineName?: string;
  version?: string;
  os?: string;
  appCount?: number;
  siteCount?: number;
  httpsSiteCount?: number;
  syncedSiteCount?: number;
  failedSiteCount?: number;
  lastSyncAt?: number;
  lastSyncStatus?: string;
};

export type ClientSnapshot = {
  appCount?: number;
  siteCount?: number;
  httpsSiteCount?: number;
  syncedSiteCount?: number;
  failedSiteCount?: number;
  lastSyncAt?: number;
  lastSyncStatus?: string;
};

// 客户端心跳上报间隔为 10 分钟，在线阈值取 30 分钟（3 倍），容忍网络抖动与偶发失败。
const ONLINE_THRESHOLD_MS = 30 * 60 * 1000;

export function isOnline(lastHeartbeatAt: number | null | undefined, now: number): boolean {
  return lastHeartbeatAt != null && now - lastHeartbeatAt <= ONLINE_THRESHOLD_MS;
}

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class ClientService extends BaseService<ClientEntity> {
  @InjectEntityModel(ClientEntity)
  repository: Repository<ClientEntity>;

  //@ts-ignore
  getRepository() {
    return this.repository;
  }

  async page(pageReq: PageReq<ClientEntity>) {
    const pageRet = await super.page(pageReq);
    const now = Date.now();
    for (const item of pageRet.records) {
      const snapshot = this.parseContent(item.content);
      item.appCount = snapshot.appCount ?? 0;
      item.siteCount = snapshot.siteCount ?? 0;
      item.httpsSiteCount = snapshot.httpsSiteCount ?? 0;
      item.syncedSiteCount = snapshot.syncedSiteCount ?? 0;
      item.failedSiteCount = snapshot.failedSiteCount ?? 0;
      item.lastSyncAt = snapshot.lastSyncAt;
      item.lastSyncStatus = snapshot.lastSyncStatus;
      item.online = isOnline(item.lastHeartbeatAt, now);
    }
    return pageRet;
  }

  async heartbeat(userId: number, projectId: number | undefined, keyId: string, bean: ClientHeartbeatReq) {
    if (!bean?.clientId) {
      throw new Error("clientId不能为空");
    }
    const content = JSON.stringify({
      appCount: bean.appCount ?? 0,
      siteCount: bean.siteCount ?? 0,
      httpsSiteCount: bean.httpsSiteCount ?? 0,
      syncedSiteCount: bean.syncedSiteCount ?? 0,
      failedSiteCount: bean.failedSiteCount ?? 0,
      lastSyncAt: bean.lastSyncAt,
      lastSyncStatus: bean.lastSyncStatus,
    });
    const now = Date.now();
    const existing = await this.repository.findOne({
      where: { userId, clientId: bean.clientId },
    });
    if (existing) {
      await this.repository.update(
        { id: existing.id },
        {
          projectId,
          keyId,
          machineName: bean.machineName,
          version: bean.version,
          os: bean.os,
          content,
          lastHeartbeatAt: now,
          updateTime: new Date(),
        }
      );
      return existing.id;
    }

    const entity = new ClientEntity();
    entity.userId = userId;
    entity.projectId = projectId;
    entity.clientId = bean.clientId;
    entity.keyId = keyId;
    entity.machineName = bean.machineName;
    entity.version = bean.version;
    entity.os = bean.os;
    entity.content = content;
    entity.lastHeartbeatAt = now;
    entity.createTime = new Date();
    entity.updateTime = new Date();
    await this.repository.save(entity);
    return entity.id;
  }

  private parseContent(content: string): ClientSnapshot {
    if (!content) {
      return {};
    }
    try {
      return JSON.parse(content) as ClientSnapshot;
    } catch (err) {
      return {};
    }
  }
}
