import { CrudController, SysSettingsService,Constants } from "@certd/lib-server";
import { ALL, Body, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import { ProjectMemberEntity } from "../../../modules/sys/enterprise/entity/project-member.js";
import { ProjectMemberService } from "../../../modules/sys/enterprise/service/project-member-service.js";
import { merge } from "lodash-es";
import { ProjectService } from "../../../modules/sys/enterprise/service/project-service.js";
import { ApiTags } from "@midwayjs/swagger";
/**
 */
@Provide()
@Controller("/api/enterprise/projectMember")
@ApiTags(['enterprise-project-member'])
export class ProjectMemberController extends CrudController<ProjectMemberEntity> {
  @Inject()
  service: ProjectMemberService;

  @Inject()
  sysSettingsService: SysSettingsService;

  @Inject()
  projectService: ProjectService;

  getService<T>() {
    return this.service;
  }

  @Post("/page", { description: Constants.per.authOnly })
  async page(@Body(ALL) body: any) {
    const {projectId} = await this.getProjectUserIdRead();
    body.query = body.query ?? {};
    body.query.projectId = projectId;
    return await super.page(body);
  }

  @Post("/list", { description: Constants.per.authOnly })
  async list(@Body(ALL) body: any) {
    const {projectId} = await this.getProjectUserIdRead();
    body.query = body.query ?? {};
    body.query.projectId = projectId;
    return super.list(body);
  }

  @Post("/add", { description: Constants.per.authOnly })
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

    return super.add(bean);
  }

  @Post("/update", { description: Constants.per.authOnly }) 
  async update(@Body(ALL) bean: any) {
    if (!bean.id) {
      throw new Error("id is required");
    }
    const projectId = await this.service.getProjectId(bean.id)
    await this.projectService.checkAdminPermission({
      userId: this.getUserId(),
      projectId: projectId,
    });
    const res = await this.service.update({
      id: bean.id,
      permission: bean.permission,
      status: bean.status,
    });

    return this.ok(res);
  }

  @Post("/info", { description: Constants.per.authOnly })
  async info(@Query("id") id: number) {
     if (!id) {
      throw new Error("id is required");
    }
    const projectId = await this.service.getProjectId(id)
    await this.projectService.checkReadPermission({
      userId: this.getUserId(),
      projectId:projectId,
    });
    return super.info(id);
  }

  @Post("/delete", { description: Constants.per.authOnly })
  async delete(@Query("id") id: number) {
    if (!id) {
      throw new Error("id is required");
    }
    const projectId = await this.service.getProjectId(id)
    await this.projectService.checkAdminPermission({
      userId: this.getUserId(),
      projectId:projectId,
    });
    return super.delete(id);
  }

  @Post("/deleteByIds", { description: Constants.per.authOnly })
  async deleteByIds(@Body("ids") ids: number[]) {
    for (const id of ids) {
      if (!id) {
        throw new Error("id is required");
      }
      const projectId = await this.service.getProjectId(id)
      await this.projectService.checkAdminPermission({
        userId: this.getUserId(),
        projectId:projectId,
      });
      await this.service.delete(id as any);
    }
   
    return this.ok({});
  }
}
