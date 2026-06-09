import { ALL, Body, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import { Constants, CrudController } from "@certd/lib-server";
import { ApiTags } from "@midwayjs/swagger";
import { CertApplyTemplateService } from "../../../modules/cert/service/cert-apply-template-service.js";

@Provide()
@Controller("/api/cert/apply-template")
@ApiTags(["cert"])
export class CertApplyTemplateController extends CrudController<CertApplyTemplateService> {
  @Inject()
  service: CertApplyTemplateService;

  getService(): CertApplyTemplateService {
    return this.service;
  }

  private removeContent(data: any) {
    const records = Array.isArray(data) ? data : data?.records;
    if (!records) {
      return data;
    }
    for (const item of records) {
      delete item.content;
    }
    return data;
  }

  @Post("/page", { description: Constants.per.authOnly, summary: "查询证书申请参数模版分页列表" })
  async page(@Body(ALL) body: any) {
    const { projectId, userId } = await this.getProjectUserIdRead();
    body.query = body.query ?? {};
    body.query.projectId = projectId;
    body.query.userId = userId;
    const res = await super.page(body);
    this.removeContent(res.data);
    return res;
  }

  @Post("/list", { description: Constants.per.authOnly, summary: "查询证书申请参数模版列表" })
  async list(@Body(ALL) body: any) {
    const { projectId, userId } = await this.getProjectUserIdRead();
    body.query = body.query ?? {};
    body.query.projectId = projectId;
    body.query.userId = userId;
    body.query.disabled = false;
    const res = await super.list(body);
    this.removeContent(res.data);
    return res;
  }

  @Post("/add", { description: Constants.per.authOnly, summary: "添加证书申请参数模版" })
  async add(@Body(ALL) bean: any) {
    const { projectId, userId } = await this.getProjectUserIdWrite();
    bean.projectId = projectId;
    bean.userId = userId;
    return super.add(bean);
  }

  @Post("/update", { description: Constants.per.authOnly, summary: "更新证书申请参数模版" })
  async update(@Body(ALL) bean: any) {
    await this.checkOwner(this.getService(), bean.id, "write");
    delete bean.userId;
    delete bean.projectId;
    return super.update(bean);
  }

  @Post("/info", { description: Constants.per.authOnly, summary: "查询证书申请参数模版详情" })
  async info(@Query("id") id: number) {
    await this.checkOwner(this.getService(), id, "read");
    return super.info(id);
  }

  @Post("/delete", { description: Constants.per.authOnly, summary: "删除证书申请参数模版" })
  async delete(@Query("id") id: number) {
    await this.checkOwner(this.getService(), id, "write");
    return super.delete(id);
  }

  @Post("/setDefault", { description: Constants.per.authOnly, summary: "设置默认证书申请参数模版" })
  async setDefault(@Body("id") id: number) {
    const { projectId, userId } = await this.getProjectUserIdWrite();
    return this.ok(await this.service.setDefault(id, userId, projectId));
  }

  @Post("/default", { description: Constants.per.authOnly, summary: "查询默认证书申请参数模版" })
  async getDefault() {
    const { projectId, userId } = await this.getProjectUserIdRead();
    return this.ok(await this.service.getDefault(userId, projectId));
  }
}
