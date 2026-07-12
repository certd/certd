import { BaseService } from "@certd/lib-server";
import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { AuditLogEntity } from "../entity/audit-log.js";
import { logger } from "@certd/basic";
import { Cron } from "../../../cron/cron.js";

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

  async log(params: { userId: number; type: string; action: string; content: string; username?: string; projectId?: number; projectName?: string; ipAddress?: string; scope?: string; success?: boolean }): Promise<void> {
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
      entity.projectName = params.projectName || "";
      entity.ipAddress = params.ipAddress || "";
      entity.scope = params.scope || "user";
      entity.success = params.success ?? true;
      await this.repository.save(entity);
    } catch (e) {
      logger.error("写入审计日志失败:", e);
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
