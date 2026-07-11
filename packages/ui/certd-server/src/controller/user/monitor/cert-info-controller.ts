import { ALL, Body, Controller, Get, Inject, Post, Provide, Query } from "@midwayjs/core";
import { CommonException, Constants, CrudController, SysSettingsService } from "@certd/lib-server";
import { AuthService } from "../../../modules/sys/authority/service/auth-service.js";
import { CertInfoService } from "../../../modules/monitor/index.js";
import { PipelineService } from "../../../modules/pipeline/service/pipeline-service.js";
import { SelectQueryBuilder } from "typeorm";
import { logger } from "@certd/basic";
import dayjs from "dayjs";
import { ApiTags } from "@midwayjs/swagger";
import { CertReader } from "@certd/plugin-lib";
import { AuditType } from "../../../modules/sys/enterprise/service/audit-constants.js";

/**
 */
@Provide()
@Controller("/api/monitor/cert")
@ApiTags(["cert"])
export class CertInfoController extends CrudController<CertInfoService> {
  @Inject()
  service: CertInfoService;
  @Inject()
  authService: AuthService;
  @Inject()
  pipelineService: PipelineService;

  @Inject()
  sysSettingService: SysSettingsService;

  getService(): CertInfoService {
    return this.service;
  }

  getAuditType(): string {
    return AuditType.monitor;
  }

  @Post("/page", { description: Constants.per.authOnly, summary: "查询证书分页列表" })
  async page(@Body(ALL) body: any) {
    body.query = body.query ?? {};

    const { projectId, userId } = await this.getProjectUserIdRead();
    body.query.projectId = projectId;
    body.query.userId = userId;
    const domains = body.query?.domains;
    delete body.query.domains;

    const expiresLeft = body.query?.expiresLeft;
    delete body.query.expiresLeft;

    const sysSetting = await this.sysSettingService.getPublicSettings();
    const DEFAULT_WILL_EXPIRE_DAYS = sysSetting?.defaultWillExpireDays || sysSetting?.defaultCertRenewDays || 15;
    const res = await this.service.page({
      query: body.query,
      page: body.page,
      sort: body.sort,
      buildQuery: bq => {
        if (domains) {
          bq.andWhere("domains like :domains", { domains: `%${domains}%` });
        }
        if (expiresLeft) {
          const willExpire = dayjs().add(DEFAULT_WILL_EXPIRE_DAYS, "day").valueOf();
          if (expiresLeft === "expired") {
            bq.andWhere("expires_time < :now", { now: Date.now() });
          } else if (expiresLeft === "expiring") {
            bq.andWhere("expires_time <= :willExpire and expires_time > :now", { willExpire, now: Date.now() });
          } else if (expiresLeft === "noExpired") {
            bq.andWhere("expires_time > :willExpire", { willExpire });
          }
        }
      },
    });

    const records = res.records;
    const pipelineIds = records.map(r => r.pipelineId);
    const pipelines = await this.pipelineService.getSimplePipelines(pipelineIds);
    const pMap = new Map();
    for (const p of pipelines) {
      pMap.set(p.id, p);
    }
    for (const record of records) {
      record.pipeline = pMap.get(record.pipelineId);
    }
    return this.ok(res);
  }

  @Post("/list", { description: Constants.per.authOnly, summary: "查询证书列表" })
  async list(@Body(ALL) body: any) {
    body.query = body.query ?? {};
    const { projectId, userId } = await this.getProjectUserIdRead();
    body.query.projectId = projectId;
    body.query.userId = userId;
    return await super.list(body);
  }

  @Post("/getOptionsByIds", { description: Constants.per.authOnly, summary: "根据ID列表获取证书选项" })
  async getOptionsByIds(@Body(ALL) body: { ids: any[] }) {
    const { projectId, userId } = await this.getProjectUserIdRead();
    const list = await this.service.list({
      query: {
        projectId,
        userId,
      },
      buildQuery: (bq: SelectQueryBuilder<any>) => {
        bq.andWhere("id in (:...ids)", { ids: body.ids });
      },
    });

    const safeList = list.map((item: any) => {
      const domainsArr = item.domains ? item.domains.split(",") : [];
      return {
        id: item.id,
        domain: item.domain,
        domains: domainsArr,
        userId: item.userId,
      };
    });
    return this.ok(safeList);
  }

  @Post("/add", { description: Constants.per.authOnly, summary: "添加证书" })
  async add(@Body(ALL) bean: any) {
    const { projectId, userId } = await this.getProjectUserIdWrite();
    bean.projectId = projectId;
    bean.userId = userId;
    const res = await super.add(bean);
    this.auditLog({ content: `新增了证书(ID:${res.data})` });
    return res;
  }

  @Post("/update", { description: Constants.per.authOnly, summary: "更新证书" })
  async update(@Body(ALL) bean) {
    await this.checkOwner(this.service, bean.id, "write");
    delete bean.userId;
    delete bean.projectId;
    const res = await super.update(bean);
    this.auditLog({ content: `修改了证书(ID:${bean.id})` });
    return res;
  }
  @Post("/info", { description: Constants.per.authOnly, summary: "查询证书详情" })
  async info(@Query("id") id: number) {
    await this.checkOwner(this.service, id, "read");
    return await super.info(id);
  }

  @Post("/delete", { description: Constants.per.authOnly, summary: "删除证书" })
  async delete(@Query("id") id: number) {
    await this.checkOwner(this.service, id, "write");
    const res = await super.delete(id);
    this.auditLog({ content: `删除了证书(ID:${id})` });
    return res;
  }

  @Post("/all", { description: Constants.per.authOnly, summary: "查询所有证书" })
  async all() {
    const { projectId, userId } = await this.getProjectUserIdRead();
    const list: any = await this.service.find({
      where: {
        projectId,
        userId,
      },
    });
    return this.ok(list);
  }

  @Post("/getCert", { description: Constants.per.authOnly, summary: "获取证书信息" })
  async getCert(@Query("id") id: number) {
    await this.checkOwner(this.getService(), id, "read");
    const certInfoEntity = await this.service.info(id);
    const certInfo = JSON.parse(certInfoEntity.certInfo);
    if (certInfo?.crt) {
      const certReader = new CertReader(certInfo);
      certInfo.detail = certReader.detail;
    }
    return this.ok(certInfo);
  }

  @Get("/download", { description: Constants.per.authOnly, summary: "下载证书文件" })
  async download(@Query("id") id: number) {
    const { userId, projectId } = await this.checkOwner(this.getService(), id, "read");
    const certInfoEntity = await this.getService().info(id);
    if (certInfoEntity == null) {
      throw new CommonException("file not found");
    }
    if (certInfoEntity.userId !== userId) {
      throw new CommonException("file not found");
    }
    if (projectId && certInfoEntity.projectId !== projectId) {
      throw new CommonException("file not found");
    }
    if (!certInfoEntity.certInfo) {
      throw new CommonException("证书数据未生成");
    }

    const certInfo = JSON.parse(certInfoEntity.certInfo);
    const certReader = new CertReader(certInfo);
    const zipBuffer = await certReader.buildZip();
    const filename = certReader.buildZipFilename("cert");

    logger.info(`download cert zip: ${filename}, size: ${zipBuffer.length}`);

    this.ctx.attachment(filename);
    this.ctx.set("Content-Type", "application/zip");
    this.ctx.body = zipBuffer;
  }
}
