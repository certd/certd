import { BaseService, AuditLogWriteParam } from "@certd/lib-server";
import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { LessThan, LessThanOrEqual, Not, Repository } from "typeorm";
import { AuditLogEntity } from "../entity/audit-log.js";
import { cache, logger } from "@certd/basic";
import { isIP } from "node:net";
import { Cron } from "../../../cron/cron.js";

export const USER_IP_HISTORY_DAYS = 30;

export function getAuditIpKey(ipAddress: string): string | undefined {
  const ip = (ipAddress || "").trim();
  const version = isIP(ip);
  if (version === 4) {
    // URL 将 IPv4 与 IPv4-mapped IPv6 转为相同的规范地址。
    return new URL(`http://[::ffff:${ip}]`).hostname;
  }
  if (version === 6) {
    const address = ip.split("%")[0];
    return new URL(`http://[${address}]`).hostname;
  }
  return undefined;
}

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class AuditService extends BaseService<AuditLogEntity> {
  @InjectEntityModel(AuditLogEntity)
  repository: Repository<AuditLogEntity>;

  @Inject()
  cron: Cron;

  getRepository() {
    return this.repository;
  }

  async page(pageReq: any) {
    if (pageReq.query?.createTime) {
      const start = pageReq.query.createTime[0];
      const end = pageReq.query.createTime[1];
      delete pageReq.query.createTime;
      pageReq.buildQuery = (qb: any) => {
        qb.andWhere("main.createTime BETWEEN :start AND :end", { start, end });
      };
    }
    return await super.page(pageReq);
  }

  async isUnusualLoginIp({ userId, ipKey }: { userId: number; ipKey: string }): Promise<boolean> {
    if (!Number.isSafeInteger(userId) || userId <= 0 || !ipKey) {
      return false;
    }
    const ips = await this.getRecentUserIps(userId);
    return ips.size > 0 && !ips.has(ipKey);
  }

  private async getRecentUserIps(userId: number): Promise<Set<string>> {
    const cacheKey = `audit.userIps:${userId}`;
    const cached = cache.get(cacheKey) as Promise<Set<string>> | undefined;
    if (cached) {
      return await cached;
    }
    const end = new Date();
    const start = new Date(end.getTime() - USER_IP_HISTORY_DAYS * 24 * 60 * 60 * 1000);
    const query = this.repository
      .createQueryBuilder("main")
      .select("main.ipAddress", "ipAddress")
      .where("main.userId = :userId", { userId })
      .andWhere("main.success = :success", { success: true })
      .andWhere("main.createTime BETWEEN :start AND :end", { start, end })
      .andWhere("main.ipAddress <> :empty", { empty: "" })
      .groupBy("main.ipAddress");
    const pending = query.getRawMany<{ ipAddress: string }>().then(async rows => {
      const ips = new Set<string>();
      for (const row of rows) {
        const ip = getAuditIpKey(row.ipAddress);
        if (ip) {
          ips.add(ip);
        }
      }
      if (ips.size === 0) {
        const lastLog = await this.findOne({
          select: { ipAddress: true },
          where: { userId, success: true, createTime: LessThanOrEqual(end), ipAddress: Not("") },
          order: { createTime: "DESC", id: "DESC" },
        });
        const ip = getAuditIpKey(lastLog?.ipAddress);
        if (ip) {
          ips.add(ip);
        }
      }
      return ips;
    });
    // 缓存查询本身，让同一用户的并发请求共用一次统计。
    cache.set(cacheKey, pending, { ttl: 60 * 60 * 1000 });
    try {
      return await pending;
    } catch (error) {
      if (cache.get(cacheKey) === pending) {
        cache.delete(cacheKey);
      }
      throw error;
    }
  }

  async log(params: AuditLogWriteParam): Promise<void> {
    try {
      let { username } = params;
      if (!username && params.userId != null) {
        const userRepo = this.repository.manager.connection.getRepository("sys_user" as any);
        const user = await userRepo.findOne({ where: { id: params.userId } });
        username = user?.username || "";
      }

      const entity = new AuditLogEntity();
      entity.userId = params.userId;
      entity.username = username || "";
      entity.type = params.type;
      entity.action = params.action;
      entity.content = params.content;
      entity.projectId = params.projectId || 0;

      entity.ipAddress = params.ipAddress || "";
      entity.scope = params.scope || "user";
      entity.success = params.success ?? true;
      await this.repository.save(entity);
    } catch (e) {
      logger.error("写入审计日志失败:", e);
      return;
    }

    // 新 IP 必须先落库，再清空统计缓存，防止重查时漏掉本次记录。
    try {
      const ip = getAuditIpKey(params.ipAddress);
      const cacheKey = `audit.userIps:${params.userId}`;
      const cached = cache.get(cacheKey) as Promise<Set<string>> | undefined;
      if (params.success !== false && ip && cached) {
        const ips = await cached;
        if (!ips.has(ip)) {
          cache.delete(cacheKey);
          await this.getRecentUserIps(params.userId);
        }
      }
    } catch (error) {
      logger.error("刷新用户常用 IP 缓存失败:", error);
    }
  }

  async cleanExpired(retentionDays: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const result = await this.repository.delete({
      createTime: LessThan(cutoff),
    } as any);
    const deletedCount = result.affected || 0;
    if (deletedCount > 0) {
      logger.info(`审计日志清理完成，删除 ${deletedCount} 条超过 ${retentionDays} 天的记录`);
    }
    return deletedCount;
  }

  registerCleanCron() {
    this.cron.register({
      name: "audit.cleanExpired",
      cron: "0 3 * * *",
      job: async () => {
        await this.cleanExpired(90);
      },
    });
  }
}
