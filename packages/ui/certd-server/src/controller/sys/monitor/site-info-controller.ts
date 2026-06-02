import { ALL, Body, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import { CrudController } from "@certd/lib-server";
import { SiteInfoService } from "../../../modules/monitor/service/site-info-service.js";
import { ApiTags } from "@midwayjs/swagger";

@Provide()
@Controller("/api/sys/monitor/site")
@ApiTags(["sys-monitor"])
export class SysSiteInfoController extends CrudController<SiteInfoService> {
  @Inject()
  service: SiteInfoService;

  getService(): SiteInfoService {
    return this.service;
  }

  @Post("/page", { description: "sys:settings:view", summary: "管理员查询站点监控分页列表" })
  async page(@Body(ALL) body: any) {
    body.query = body.query ?? {};
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
      buildQuery: bq => {
        if (domain) {
          bq.andWhere("domain like :domain", { domain: `%${domain}%` });
        }
        if (certDomains) {
          bq.andWhere("cert_domains like :cert_domains", { cert_domains: `%${certDomains}%` });
        }
        if (name) {
          bq.andWhere("name like :name", { name: `%${name}%` });
        }
      },
    });
    return this.ok(res);
  }

  @Post("/delete", { description: "sys:settings:edit", summary: "管理员删除站点监控" })
  async delete(@Query("id") id: number) {
    return await super.delete(id);
  }

  @Post("/batchDelete", { description: "sys:settings:edit", summary: "管理员批量删除站点监控" })
  async batchDelete(@Body("ids") ids: number[]) {
    await this.service.delete(ids);
    return this.ok();
  }
}
