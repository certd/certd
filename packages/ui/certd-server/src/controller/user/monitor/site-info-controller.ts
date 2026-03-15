import { ALL, Body, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import { Constants, CrudController } from "@certd/lib-server";
import { AuthService } from "../../../modules/sys/authority/service/auth-service.js";
import { SiteInfoService } from "../../../modules/monitor/service/site-info-service.js";
import { UserSiteMonitorSetting } from "../../../modules/mine/service/models.js";
import { merge } from "lodash-es";
import {SiteIpService} from "../../../modules/monitor/service/site-ip-service.js";
import { utils } from "@certd/basic";
import { ApiTags } from "@midwayjs/swagger";

/**
 */
@Provide()
@Controller('/api/monitor/site')
@ApiTags(['monitor'])
export class SiteInfoController extends CrudController<SiteInfoService> {
  @Inject()
  service: SiteInfoService;
  @Inject()
  authService: AuthService;
  @Inject()
  siteIpService: SiteIpService;

  getService(): SiteInfoService {
    return this.service;
  }

  @Post('/page', { description: Constants.per.authOnly })
  async page(@Body(ALL) body: any) {
    body.query = body.query ?? {};
    const { projectId, userId } = await this.getProjectUserIdRead()
    body.query.projectId = projectId
    body.query.userId = userId;
    const certDomains = body.query.certDomains;
    const domain = body.query.domain;
    const name = body.query.name;
    delete body.query.certDomains;
    delete body.query.domain;
    delete body.query.name;
    const res = await this.service.page({
      query: body.query,
      page: body.page,
      sort: body.sort,
      buildQuery: (bq) => {
        if (domain) {
          bq.andWhere('domain like :domain', { domain: `%${domain}%` });
        }
        if (certDomains) {
          bq.andWhere('cert_domains like :cert_domains', { cert_domains: `%${certDomains}%` });
        }
        if (name) {
          bq.andWhere('name like :name', { name: `%${name}%` });
        }
      }
    });
    return this.ok(res);
  }

  @Post('/list', { description: Constants.per.authOnly })
  async list(@Body(ALL) body: any) {
    body.query = body.query ?? {};
    const { projectId, userId } = await this.getProjectUserIdRead()
    body.query.projectId = projectId
    body.query.userId = userId;
    return await super.list(body);
  }

  @Post('/add', { description: Constants.per.authOnly })
  async add(@Body(ALL) bean: any) {
    const { projectId, userId } = await this.getProjectUserIdWrite()
    bean.projectId = projectId
    bean.userId = userId;
    const res = await this.service.add(bean);
    const entity = await this.service.info(res.id);
    if (entity.disabled) {
      this.service.check(entity.id, true, 0);
    }
    return this.ok(res);
  }

  @Post('/update', { description: Constants.per.authOnly })
  async update(@Body(ALL) bean) {
    await this.checkOwner(this.service,bean.id,"write");
    delete bean.userId;
    delete bean.projectId;
    await this.service.update(bean);
    const entity = await this.service.info(bean.id);
    if (entity.disabled) {
      this.service.check(entity.id, true, 0);
    }
    return this.ok();
  }
  @Post('/info', { description: Constants.per.authOnly })
  async info(@Query('id') id: number) {
    await this.checkOwner(this.service,id,"read");
    return await super.info(id);
  }

  @Post('/delete', { description: Constants.per.authOnly })
  async delete(@Query('id') id: number) {
    await this.checkOwner(this.service,id,"write");
    return await super.delete(id);
  }


  @Post('/batchDelete', { description: Constants.per.authOnly })
  async batchDelete(@Body(ALL) body: any) {
    const { projectId, userId } = await this.getProjectUserIdWrite()
    await this.service.batchDelete(body.ids,userId,projectId);
    return this.ok();
  }

  @Post('/check', { description: Constants.per.authOnly })
  async check(@Body('id') id: number) {
    await this.checkOwner(this.service,id,"read");
    await this.service.check(id, true, 0);
    await utils.sleep(1000);
    return this.ok();
  }

  @Post('/checkAll', { description: Constants.per.authOnly })
  async checkAll() {
    const { projectId, userId } = await this.getProjectUserIdWrite()
    await this.service.checkAllByUsers(userId,projectId);
    return this.ok();
  }

  @Post('/import', { description: Constants.per.authOnly })
  async doImport(@Body(ALL) body: any) {
    const { projectId, userId } = await this.getProjectUserIdWrite()
    await this.service.doImport({
      text:body.text,
      groupId:body.groupId,
      userId,
      projectId
    })
    return this.ok();
  }


  @Post('/ipCheckChange', { description: Constants.per.authOnly })
  async ipCheckChange(@Body(ALL) bean: any) {
    await this.checkOwner(this.service,bean.id,"read");
    await this.service.ipCheckChange({
      id: bean.id,
      ipCheck: bean.ipCheck
    });
    return this.ok();
  }

  @Post('/disabledChange', { description: Constants.per.authOnly })
  async disabledChange(@Body(ALL) bean: any) {
    await this.checkOwner(this.service,bean.id,"write");
    await this.service.disabledChange({
      id: bean.id,
      disabled: bean.disabled
    });
    return this.ok();
  }

  @Post("/setting/get", { description: Constants.per.authOnly })
  async get() {
    const { userId, projectId } = await this.getProjectUserIdRead()
    const setting = await this.service.getSetting(userId, projectId)
    return this.ok(setting);
  }

  @Post("/setting/save", { description: Constants.per.authOnly })
  async save(@Body(ALL) bean: any) {
    const { userId, projectId} = await this.getProjectUserIdWrite()
    const setting = new UserSiteMonitorSetting();
    merge(setting, bean);

    await this.service.saveSetting(userId, projectId,setting);
    return this.ok({});
  }

}
