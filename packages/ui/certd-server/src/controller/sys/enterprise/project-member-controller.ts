import { CrudController, SysSettingsService } from "@certd/lib-server";
import { ALL, Body, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import { ProjectMemberEntity } from "../../../modules/sys/enterprise/entity/project-member.js";
import { ProjectMemberService } from "../../../modules/sys/enterprise/service/project-member-service.js";
import { merge } from "lodash-es";
import { ProjectService } from "../../../modules/sys/enterprise/service/project-service.js";
import { AuditType } from "../../../modules/sys/enterprise/service/audit-constants.js";

/**
 */
@Provide()
@Controller("/api/sys/enterprise/projectMember")
export class SysProjectMemberController extends CrudController<ProjectMemberEntity> {
  @Inject()
  service: ProjectMemberService;

  @Inject()
  sysSettingsService: SysSettingsService;
  @Inject()
  projectService: ProjectService;

  getService<T>() {
    return this.service;
  }

  getAuditType(): string {
    return AuditType.enterprise.value;
  }

  @Post("/page", { description: "sys:settings:view", summary: "查询项目成员分页列表" })
  async page(@Body(ALL) body: any) {
    body.query = body.query ?? {};
    return await super.page(body);
  }

  @Post("/list", { description: "sys:settings:view", summary: "查询项目成员列表" })
  async list(@Body(ALL) body: any) {
    return super.list(body);
  }

  @Post("/add", { description: "sys:settings:edit", summary: "添加项目成员" })
  async add(@Body(ALL) bean: any) {
    const def: any = {
      isDefault: false,
      disabled: false,
    };
    merge(bean, def);

    await this.projectService.checkAdminPermission({
      userId: this.getUserId(),
      projectId: bean.projectId,
    });

    const res = await super.add(bean);
    await this.auditLog({ content: `添加了项目成员(ID:${res.data})` });
    return res;
  }

  @Post("/update", { description: "sys:settings:edit", summary: "更新项目成员" })
  async update(@Body(ALL) bean: any) {
    if (!bean.id) {
      throw new Error("id is required");
    }
    const projectId = await this.service.getProjectId(bean.id);
    await this.projectService.checkAdminPermission({
      userId: this.getUserId(),
      projectId: projectId,
    });
    const res = await this.service.update({
      id: bean.id,
      permission: bean.permission,
      status: bean.status,
    });
    await this.auditLog({ content: `更新了项目成员(ID:${bean.id})` });
    return this.ok(res);
  }

  @Post("/info", { description: "sys:settings:view", summary: "查询项目成员详情" })
  async info(@Query("id") id: number) {
    if (!id) {
      throw new Error("id is required");
    }
    const projectId = await this.service.getProjectId(id);
    await this.projectService.checkReadPermission({
      userId: this.getUserId(),
      projectId: projectId,
    });
    return super.info(id);
  }

  @Post("/delete", { description: "sys:settings:edit", summary: "删除项目成员" })
  async delete(@Query("id") id: number) {
    if (!id) {
      throw new Error("id is required");
    }
    const projectId = await this.service.getProjectId(id);
    await this.projectService.checkAdminPermission({
      userId: this.getUserId(),
      projectId: projectId,
    });
    const res = await super.delete(id);
    await this.auditLog({ content: `删除了项目成员(ID:${id})` });
    return res;
  }

  @Post("/deleteByIds", { description: "sys:settings:edit", summary: "批量删除项目成员" })
  async deleteByIds(@Body("ids") ids: number[]) {
    for (const id of ids) {
      if (!id) {
        throw new Error("id is required");
      }
      const projectId = await this.service.getProjectId(id);
      await this.projectService.checkAdminPermission({
        userId: this.getUserId(),
        projectId: projectId,
      });
      await this.service.delete(id as any);
    }

    await this.auditLog({ content: `批量删除了${ids.length}个项目成员` });
    return this.ok({});
  }
}
