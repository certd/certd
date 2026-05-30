import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { BaseService, SysSettingsService } from "@certd/lib-server";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { Repository } from "typeorm";
import { ProjectMemberEntity } from "../entity/project-member.js";

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class ProjectMemberService extends BaseService<ProjectMemberEntity> {
  @InjectEntityModel(ProjectMemberEntity)
  repository: Repository<ProjectMemberEntity>;

  @Inject()
  sysSettingsService: SysSettingsService;

  //@ts-ignore
  getRepository() {
    return this.repository;
  }

  async add(bean: Partial<ProjectMemberEntity>) {
    const { projectId, userId } = bean;
    if (!projectId) {
      throw new Error("项目ID不能为空");
    }
    if (!userId || userId <= 0) {
      throw new Error("用户ID不能为空");
    }
    const exist = await this.repository.findOne({
      where: {
        projectId,
        userId,
      },
    });
    if (exist) {
      throw new Error("项目用户已存在");
    }
    return await super.add(bean);
  }

  async getByUserId(userId: number, status?: string) {
    return await this.repository.find({
      where: {
        userId,
        status,
      },
    });
  }

  async getMember(projectId: number, userId: number, status?: string) {
    return await this.repository.findOne({
      where: {
        userId,
        projectId,
        status,
      },
    });
  }

  async getProjectId(id: number) {
    const member = await this.repository.findOne({
      select: ["projectId"],
      where: {
        id: id,
      },
    });
    if (!member) {
      throw new Error("项目成员记录不存在");
    }
    return member.projectId;
  }
}
