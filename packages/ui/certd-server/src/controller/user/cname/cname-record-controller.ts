import { ALL, Body, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import { Constants, CrudController } from "@certd/lib-server";
import { CnameRecordService } from "../../../modules/cname/service/cname-record-service.js";
import { ApiTags } from "@midwayjs/swagger";

/**
 * 授权
 */
@Provide()
@Controller("/api/cname/record")
@ApiTags(["pipeline-cname"])
export class CnameRecordController extends CrudController<CnameRecordService> {
  @Inject()
  service: CnameRecordService;

  getService(): CnameRecordService {
    return this.service;
  }

  @Post("/page", { description: Constants.per.authOnly, summary: "查询CNAME记录分页列表" })
  async page(@Body(ALL) body: any) {
    const { userId, projectId } = await this.getProjectUserIdRead();
    body.query = body.query ?? {};
    body.query.userId = userId;
    body.query.projectId = projectId;
    const domain = body.query.domain;
    delete body.query.domain;

    const bq = qb => {
      if (domain) {
        qb.andWhere("domain like :domain", { domain: `%${domain}%` });
      }
    };

    const pageRet = await this.getService().page({
      query: body.query,
      page: body.page,
      sort: body.sort,
      buildQuery: bq,
    });
    return this.ok(pageRet);
  }

  @Post("/list", { description: Constants.per.authOnly, summary: "查询CNAME记录列表" })
  async list(@Body(ALL) body: any) {
    const { userId, projectId } = await this.getProjectUserIdRead();
    body.query = body.query ?? {};
    body.query.userId = userId;
    body.query.projectId = projectId;
    const list = await this.getService().list(body);
    return this.ok(list);
  }

  @Post("/add", { description: Constants.per.authOnly, summary: "添加CNAME记录" })
  async add(@Body(ALL) bean: any) {
    const { userId, projectId } = await this.getProjectUserIdWrite();
    bean.userId = userId;
    bean.projectId = projectId;
    return super.add(bean);
  }

  @Post("/update", { description: Constants.per.authOnly, summary: "更新CNAME记录" })
  async update(@Body(ALL) bean: any) {
    await this.checkOwner(this.getService(), bean.id, "write");
    delete bean.userId;
    delete bean.projectId;
    return super.update(bean);
  }

  @Post("/info", { description: Constants.per.authOnly, summary: "查询CNAME记录详情" })
  async info(@Query("id") id: number) {
    await this.checkOwner(this.getService(), id, "read");
    return super.info(id);
  }

  @Post("/delete", { description: Constants.per.authOnly, summary: "删除CNAME记录" })
  async delete(@Query("id") id: number) {
    await this.checkOwner(this.getService(), id, "write");
    return super.delete(id);
  }

  @Post("/deleteByIds", { description: Constants.per.authOnly, summary: "批量删除CNAME记录" })
  async deleteByIds(@Body(ALL) body: any) {
    const { userId, projectId } = await this.getProjectUserIdWrite();
    await this.service.batchDelete(body.ids, userId, projectId);
    return this.ok();
  }
  @Post("/getByDomain", { description: Constants.per.authOnly, summary: "根据域名获取CNAME记录" })
  async getByDomain(@Body(ALL) body: { domain: string; createOnNotFound: boolean }) {
    const { userId, projectId } = await this.getProjectUserIdRead();
    const res = await this.service.getByDomain(body.domain, userId, projectId, body.createOnNotFound);
    return this.ok(res);
  }

  @Post("/verify", { description: Constants.per.authOnly, summary: "验证CNAME记录" })
  async verify(@Body(ALL) body: { id: number }) {
    await this.checkOwner(this.getService(), body.id, "read");
    const res = await this.service.verify(body.id);
    return this.ok(res);
  }

  @Post("/resetStatus", { description: Constants.per.authOnly, summary: "重置CNAME记录状态" })
  async resetStatus(@Body(ALL) body: { id: number }) {
    await this.checkOwner(this.getService(), body.id, "read");
    const res = await this.service.resetStatus(body.id);
    return this.ok(res);
  }
  @Post("/import", { description: Constants.per.authOnly, summary: "导入CNAME记录" })
  async import(@Body(ALL) body: { domainList: string; cnameProviderId: any }) {
    const { userId, projectId } = await this.getProjectUserIdWrite();
    const res = await this.service.doImport({
      userId,
      projectId,
      domainList: body.domainList,
      cnameProviderId: body.cnameProviderId,
    });
    return this.ok(res);
  }
}
