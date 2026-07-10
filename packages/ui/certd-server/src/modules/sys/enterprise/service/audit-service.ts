import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { TypeORMDataSourceManager } from "@midwayjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { AuditLogEntity } from "../entity/audit-log.js";
import { logger } from "@certd/basic";
import { Cron } from "../../../cron/cron.js";

export type AuditPageReq = {
  page?: { offset: number; limit: number };
  query?: {
    userId?: number;
    type?: string;
    action?: string;
    createTime_start?: string;
    createTime_end?: string;
  };
  sort?: { prop: string; asc: boolean };
};

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class AuditService {
  @Inject()
  dataSourceManager: TypeORMDataSourceManager;

  @Inject()
  cron: Cron;

  getRepository(): Repository<AuditLogEntity> {
    return this.dataSourceManager.getDataSource("default").getRepository(AuditLogEntity);
  }

  async log(params: { userId: number; type: string; action: string; content: string; username?: string; projectId?: number; projectName?: string; ipAddress?: string }): Promise<void> {
    try {
      let { username } = params;
      if (!username && params.userId != null) {
        const userRepo = this.dataSourceManager.getDataSource("default").getRepository("sys_user" as any);
        const user = await userRepo.findOne({ where: { id: params.userId } });
        username = user?.username || "";
      }

      const repo = this.getRepository();
      const entity = new AuditLogEntity();
      entity.userId = params.userId;
      entity.userName = username || "";
      entity.type = params.type;
      entity.action = params.action;
      entity.content = params.content;
      entity.projectId = params.projectId || 0;
      entity.projectName = params.projectName || "";
      entity.ipAddress = params.ipAddress || "";
      await repo.save(entity);
    } catch (e) {
      logger.error("写入审计日志失败:", e);
    }
  }

  async page(pageReq: AuditPageReq) {
    const repo = this.getRepository();
    const { page, query, sort } = pageReq;
    const offset = page?.offset ?? 0;
    const limit = page?.limit ?? 20;

    const qb = repo.createQueryBuilder("main");

    if (query?.userId != null) {
      qb.andWhere("main.userId = :userId", { userId: query.userId });
    }
    if (query?.type) {
      qb.andWhere("main.type = :type", { type: query.type });
    }
    if (query?.action) {
      qb.andWhere("main.action = :action", { action: query.action });
    }
    if (query?.createTime_start) {
      qb.andWhere("main.createTime >= :start", { start: query.createTime_start });
    }
    if (query?.createTime_end) {
      qb.andWhere("main.createTime <= :end", { end: query.createTime_end });
    }

    if (sort?.prop) {
      qb.orderBy("main." + sort.prop, sort.asc ? "ASC" : "DESC");
    } else {
      qb.orderBy("main.id", "DESC");
    }

    qb.skip(offset).take(limit);
    const list = await qb.getMany();
    const total = await qb.getCount();

    return {
      records: list,
      total,
      offset,
      limit,
    };
  }

  async cleanExpired(retentionDays: number): Promise<number> {
    const repo = this.getRepository();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const result = await repo.delete({
      createTime: LessThan(cutoff),
    } as any);
    const deletedCount = result.affected || 0;
    if (deletedCount > 0) {
      logger.info(`审计日志清理完成，删除 ${deletedCount} 条超过 ${retentionDays} 天的记录`);
    }
    return deletedCount;
  }

  async delete(id: number): Promise<void> {
    const repo = this.getRepository();
    await repo.delete({ id });
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
