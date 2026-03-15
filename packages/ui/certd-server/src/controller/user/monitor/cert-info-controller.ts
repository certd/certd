import { ALL, Body, Controller, Get, Inject, Post, Provide, Query } from "@midwayjs/core";
import { CommonException, Constants, CrudController, SysSettingsService } from "@certd/lib-server";
import { AuthService } from "../../../modules/sys/authority/service/auth-service.js";
import { CertInfoService } from "../../../modules/monitor/index.js";
import { PipelineService } from "../../../modules/pipeline/service/pipeline-service.js";
import { SelectQueryBuilder } from "typeorm";
import { logger } from "@certd/basic";
import fs from "fs";
import dayjs from "dayjs";
import { ApiTags } from "@midwayjs/swagger";
import { CertReader } from "@certd/plugin-lib";

/**
 */
@Provide()
@Controller('/api/monitor/cert')
@ApiTags(['cert'])
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

  @Post('/page', { description: Constants.per.authOnly, summary: "查询证书分页列表" })
  async page(@Body(ALL) body: any) {
    body.query = body.query ?? {};

    const { projectId, userId } = await this.getProjectUserIdRead()
    body.query.projectId = projectId
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
      buildQuery: (bq) => {
        if (domains) {
          bq.andWhere('domains like :domains', { domains: `%${domains}%` });
        }
        if (expiresLeft) {
          const willExpire = dayjs().add(DEFAULT_WILL_EXPIRE_DAYS, 'day').valueOf();
          if (expiresLeft === "expired") {
            bq.andWhere('expires_time < :now', { now: Date.now() });
          } else if (expiresLeft === "expiring") {
            bq.andWhere('expires_time <= :willExpire and expires_time > :now', { willExpire, now: Date.now() });
          } else if (expiresLeft === "noExpired") {
            bq.andWhere('expires_time > :willExpire', { willExpire });
          }
        }
      }
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

  @Post('/list', { description: Constants.per.authOnly, summary: "查询证书列表" })
  async list(@Body(ALL) body: any) {
    body.query = body.query ?? {};
    const { projectId, userId } = await this.getProjectUserIdRead()
    body.query.projectId = projectId
    body.query.userId = userId;
    return await super.list(body);
  }


  @Post('/getOptionsByIds', { description: Constants.per.authOnly, summary: "根据ID列表获取证书选项" })
  async getOptionsByIds(@Body(ALL) body: {ids:any[]}) {
    const { projectId, userId } = await this.getProjectUserIdRead()
    const list = await this.service.list({
      query:{
        projectId,
        userId,
      },
      buildQuery: (bq: SelectQueryBuilder<any>) => {
        bq.andWhere('id in (:...ids)', { ids: body.ids });
      }
    })

    const safeList =list.map((item:any) => {
      const domainsArr = item.domains? item.domains.split(',') : [];
      return {
        id: item.id,
        domain: item.domain,
        domains:domainsArr,
        userId: item.userId,
      }
    })
    return this.ok(safeList);
  }

  @Post('/add', { description: Constants.per.authOnly, summary: "添加证书" })
  async add(@Body(ALL) bean: any) {
    const { projectId, userId } = await this.getProjectUserIdWrite()
    bean.projectId = projectId
    bean.userId = userId;
    return await super.add(bean);
  }

  @Post('/update', { description: Constants.per.authOnly, summary: "更新证书" })
  async update(@Body(ALL) bean) {
    await this.checkOwner(this.service,bean.id,"write");
    delete bean.userId;
    delete bean.projectId;
    return await super.update(bean);
  }
  @Post('/info', { description: Constants.per.authOnly, summary: "查询证书详情" })
  async info(@Query('id') id: number) {
    await this.checkOwner(this.service,id,"read");
    return await super.info(id);
  }

  @Post('/delete', { description: Constants.per.authOnly, summary: "删除证书" })
  async delete(@Query('id') id: number) {
    await this.checkOwner(this.service,id,"write");
    return await super.delete(id);
  }

  @Post('/all', { description: Constants.per.authOnly, summary: "查询所有证书" })
  async all() {
    const { projectId, userId } = await this.getProjectUserIdRead()
    const list: any = await this.service.find({
      where: {
        projectId,
        userId,
      },
    });
    return this.ok(list);
  }



  @Post('/getCert', { description: Constants.per.authOnly, summary: "获取证书信息" })
  async getCert(@Query('id') id: number) {
    await this.checkOwner(this.getService(),id,"read");
    const certInfoEntity = await this.service.info(id);
    const certInfo = JSON.parse(certInfoEntity.certInfo);
    if (certInfo?.crt) {
      const certReader = new CertReader(certInfo);
      certInfo.detail = certReader.detail
    }
    return this.ok(certInfo);
  }

  @Get('/download', { description: Constants.per.authOnly, summary: "下载证书文件" })
  async download(@Query('id') id: number) {
    const {userId,projectId} =await this.checkOwner(this.getService(),id,"read");
    const certInfo = await this.getService().info(id)
    if (certInfo == null) {
      throw new CommonException('file not found');
    }
    if (certInfo.userId !== userId) {
      throw new CommonException('file not found');
    }
    if (projectId && certInfo.projectId !== projectId) {
      throw new CommonException('file not found');
    }
    // koa send file
    // 下载文件的名称
    // const filename = file.filename;
    // 要下载的文件的完整路径
    const path = certInfo.certFile;
    if (!path) {
      throw new CommonException('file not found');
    }
    logger.info(`download:${path}`);
    // 以流的形式下载文件
    this.ctx.attachment(path);
    this.ctx.set('Content-Type', 'application/octet-stream');

    return fs.createReadStream(path);
  }
}
