import { ALL, Body, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import { Constants, CrudController } from "@certd/lib-server";
import { ApiTags } from "@midwayjs/swagger";
import { DnsPersistRecordService } from "../../../modules/cert/service/dns-persist-record-service.js";

@Provide()
@Controller("/api/cert/dns-persist")
@ApiTags(["cert"])
export class DnsPersistRecordController extends CrudController<DnsPersistRecordService> {
  @Inject()
  service: DnsPersistRecordService;

  getService(): DnsPersistRecordService {
    return this.service;
  }

  @Post("/page", { description: Constants.per.authOnly, summary: "查询DNS持久验证记录分页列表" })
  async page(@Body(ALL) body: any) {
    const { projectId, userId } = await this.getProjectUserIdRead();
    body.query = body.query ?? {};
    body.query.projectId = projectId;
    body.query.userId = userId;
    return super.page(body);
  }

  @Post("/add", { description: Constants.per.authOnly, summary: "添加DNS持久验证记录" })
  async add(@Body(ALL) bean: any) {
    const { projectId, userId } = await this.getProjectUserIdWrite();
    bean.projectId = projectId;
    bean.userId = userId;
    return super.add(bean);
  }

  @Post("/update", { description: Constants.per.authOnly, summary: "更新DNS持久验证记录" })
  async update(@Body(ALL) bean: any) {
    await this.checkOwner(this.getService(), bean.id, "write");
    delete bean.userId;
    delete bean.projectId;
    return super.update(bean);
  }

  @Post("/info", { description: Constants.per.authOnly, summary: "查询DNS持久验证记录详情" })
  async info(@Query("id") id: number) {
    await this.checkOwner(this.getService(), id, "read");
    return super.info(id);
  }

  @Post("/delete", { description: Constants.per.authOnly, summary: "删除DNS持久验证记录" })
  async delete(@Query("id") id: number) {
    await this.checkOwner(this.getService(), id, "write");
    await this.service.delete(id as any);
    return this.ok({
      message: this.service.lastDeleteMessage,
    });
  }

  @Post("/build", { description: Constants.per.authOnly, summary: "生成DNS持久验证记录值" })
  async build(@Body(ALL) body: { domain: string; accountUri: string; wildcard?: boolean; persistUntil?: number }) {
    const { projectId, userId } = await this.getProjectUserIdRead();
    return this.ok(await this.service.buildRecord({ ...body, userId, projectId }));
  }

  @Post("/getByDomain", { description: Constants.per.authOnly, summary: "根据域名获取或创建DNS持久验证记录" })
  async getByDomain(@Body(ALL) body: { domain: string; caType?: string; acmeAccountAccessId?: number; commonAcmeAccountAccessId?: number; wildcard?: boolean; persistUntil?: number; createOnNotFound?: boolean }) {
    const { projectId, userId } = await this.getProjectUserIdWrite();
    return this.ok(await this.service.getByDomain({ ...body, userId, projectId }));
  }

  @Post("/check", { description: Constants.per.authOnly, summary: "校验DNS持久验证记录" })
  async check(@Body(ALL) body: { hostRecord: string; recordValue: string }) {
    return this.ok(await this.service.checkRecord(body));
  }

  @Post("/verify", { description: Constants.per.authOnly, summary: "验证DNS持久验证记录" })
  async verify(@Body(ALL) body: { id: number }) {
    await this.checkOwner(this.getService(), body.id, "write");
    return this.ok(await this.service.verify(body.id));
  }

  @Post("/triggerVerify", { description: Constants.per.authOnly, summary: "后台验证DNS持久验证记录" })
  async triggerVerify(@Body(ALL) body: { id: number }) {
    await this.checkOwner(this.getService(), body.id, "write");
    return this.ok(await this.service.triggerVerify(body.id));
  }

  @Post("/createTxt", { description: Constants.per.authOnly, summary: "一键创建DNS持久验证TXT记录" })
  async createTxt(@Body(ALL) body: { id: number; dnsProviderType?: string; dnsProviderAccess?: number }) {
    await this.checkOwner(this.getService(), body.id, "write");
    return this.ok(await this.service.createDnsTxt(body));
  }
}
