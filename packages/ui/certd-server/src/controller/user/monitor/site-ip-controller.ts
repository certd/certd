import { ALL, Body, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import { Constants, CrudController } from "@certd/lib-server";
import { AuthService } from "../../../modules/sys/authority/service/auth-service.js";
import { SiteIpService } from "../../../modules/monitor/service/site-ip-service.js";
import { SiteInfoService } from "../../../modules/monitor/index.js";

/**
 */
@Provide()
@Controller('/api/monitor/site/ip')
export class SiteInfoController extends CrudController<SiteIpService> {
  @Inject()
  service: SiteIpService;
  @Inject()
  authService: AuthService;
  @Inject()
  siteInfoService: SiteInfoService;

  getService(): SiteIpService {
    return this.service;
  }

  @Post('/page', { summary: Constants.per.authOnly })
  async page(@Body(ALL) body: any) {
    const { projectId, userId } = await this.getProjectUserIdRead()
    body.query = body.query ?? {};
    body.query.userId = userId;
    body.query.projectId = projectId
    const res = await this.service.page({
      query: body.query,
      page: body.page,
      sort: body.sort,
    });
    return this.ok(res);
  }

  @Post('/list', { summary: Constants.per.authOnly })
  async list(@Body(ALL) body: any) {
    body.query = body.query ?? {};
    const { projectId, userId } = await this.getProjectUserIdRead()
    body.query.userId = userId;
    body.query.projectId = projectId
    return await super.list(body);
  }

  @Post('/add', { summary: Constants.per.authOnly })
  async add(@Body(ALL) bean: any) {
    const { projectId, userId } = await this.getProjectUserIdWrite()
    bean.userId = userId;
    bean.projectId = projectId
    bean.from = "manual"
    const res = await this.service.add(bean);
    const siteEntity = await this.siteInfoService.info(bean.siteId);
    if(!siteEntity.disabled){
      const {domain,  httpsPort} = siteEntity;
      this.service.check(res.id,domain,  httpsPort);
    }
    return this.ok(res);
  }

  @Post('/update', { summary: Constants.per.authOnly })
  async update(@Body(ALL) bean) {
    await this.checkOwner(this.service,bean.id,"write");
    delete bean.userId;
    delete bean.projectId;
    await this.service.update(bean);
    const siteEntity = await this.siteInfoService.info(bean.siteId);
    if(!siteEntity.disabled){
      const {domain,  httpsPort} = siteEntity;
      this.service.check(siteEntity.id,domain,  httpsPort);
    }
    return this.ok();
  }
  @Post('/info', { summary: Constants.per.authOnly })
  async info(@Query('id') id: number) {
    await this.checkOwner(this.service,id,"read");
    return await super.info(id);
  }

  @Post('/delete', { summary: Constants.per.authOnly })
  async delete(@Query('id') id: number) {
    await this.checkOwner(this.service,id,"write");
    const entity = await this.service.info(id);
    const res = await super.delete(id);
    await this.service.updateIpCount(entity.siteId)
    return res
  }



  @Post('/check', { summary: Constants.per.authOnly })
  async check(@Body('id') id: number) {
    await this.checkOwner(this.service,id,"read");
    const entity = await this.service.info(id);
    const siteEntity = await this.siteInfoService.info(entity.siteId);
    const domain = siteEntity.domain;
    const port = siteEntity.httpsPort;
    this.service.check(id,domain,port);
    return this.ok();
  }

  @Post('/checkAll', { summary: Constants.per.authOnly })
  async checkAll(@Body('siteId') siteId: number) {
    await this.getProjectUserIdRead()
    const siteEntity = await this.siteInfoService.info(siteId);
    await this.service.syncAndCheck(siteEntity);
    return this.ok();
  }

  @Post('/sync', { summary: Constants.per.authOnly })
  async sync(@Body('siteId') siteId: number) {
    await this.getProjectUserIdWrite()
    const entity = await this.siteInfoService.info(siteId)
    await this.service.sync(entity);
    return this.ok();
  }

  @Post('/import', { summary: Constants.per.authOnly })
  async doImport(@Body(ALL) body: any) {
    const { userId, projectId } = await this.getProjectUserIdWrite()
    await this.service.doImport({
      text:body.text,
      userId,
      siteId:body.siteId,
      projectId
    })
    return this.ok();
  }


}
