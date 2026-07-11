import { ALL, Body, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import { CrudController } from "@certd/lib-server";
import { SiteInfoService } from "../../../modules/monitor/service/site-info-service.js";
import { ApiTags } from "@midwayjs/swagger";
import { AuditType } from "../../../modules/sys/enterprise/service/audit-constants.js";

@Provide()
@Controller("/api/sys/monitor/site")
@ApiTags(["sys-monitor"])
export class SysSiteInfoController extends CrudController<SiteInfoService> {
  @Inject()
  service: SiteInfoService;

  getService(): SiteInfoService {
    return this.service;
  }

  getAuditType(): string {
    return AuditType.monitor;
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
    await super.delete(id);
    await this.auditLog({ content: `管理员删除了站点监控(ID:${id})` });
    return this.ok();
  }

  @Post("/batchDelete", { description: "sys:settings:edit", summary: "管理员批量删除站点监控" })
  async batchDelete(@Body("ids") ids: number[]) {
    const count = ids.length;
    await this.service.delete(ids);
    await this.auditLog({ content: `管理员批量删除了${count}条站点监控` });
    return this.ok();
  }
}
