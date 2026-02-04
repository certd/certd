import { CrudController, SysSettingsService } from "@certd/lib-server";
import { ALL, Body, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import { ProjectMemberEntity } from "../../../modules/sys/enterprise/entity/project-member.js";
import { ProjectMemberService } from "../../../modules/sys/enterprise/service/project-member-service.js";
import { merge } from "lodash-es";

/**
 */
@Provide()
@Controller("/api/sys/enterprise/projectMember")
export class SysProjectMemberController extends CrudController<ProjectMemberEntity> {
  @Inject()
  service: ProjectMemberService;

  @Inject()
  sysSettingsService: SysSettingsService;

  getService<T>() {
    return this.service;
  }

  @Post("/page", { summary: "sys:settings:view" })
  async page(@Body(ALL) body: any) {
    body.query = body.query ?? {};
    return await super.page(body);
  }

  @Post("/list", { summary: "sys:settings:view" })
  async list(@Body(ALL) body: any) {
    return super.list(body);
  }

  @Post("/add", { summary: "sys:settings:edit" })
  async add(@Body(ALL) bean: any) {
    const def: any = {
      isDefault: false,
      disabled: false,
    };
    merge(bean, def);
    bean.userId = this.getUserId();
    return super.add(bean);
  }

  @Post("/update", { summary: "sys:settings:edit" })
  async update(@Body(ALL) bean: any) {
    bean.userId = this.getUserId();
    return super.update(bean);
  }

  @Post("/info", { summary: "sys:settings:view" })
  async info(@Query("id") id: number) {
    return super.info(id);
  }

  @Post("/delete", { summary: "sys:settings:edit" })
  async delete(@Query("id") id: number) {
    return super.delete(id);
  }

  @Post("/deleteByIds", { summary: "sys:settings:edit" })
  async deleteByIds(@Body("ids") ids: number[]) {
    const res = await this.service.delete(ids);
    return this.ok(res);
  }
}
