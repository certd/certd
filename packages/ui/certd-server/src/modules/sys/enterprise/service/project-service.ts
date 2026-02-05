import {Inject, Provide, Scope, ScopeEnum} from '@midwayjs/core';
import {BaseService, SysSettingsService} from '@certd/lib-server';
import {InjectEntityModel} from '@midwayjs/typeorm';
import {In, Repository} from 'typeorm';
import { ProjectEntity } from '../entity/project.js';
import { ProjectMemberService } from './project-member-service.js';

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class ProjectService extends BaseService<ProjectEntity> {
  @InjectEntityModel(ProjectEntity)
  repository: Repository<ProjectEntity>;

  @Inject()
  projectMemberService: ProjectMemberService;

  @Inject()
  sysSettingsService: SysSettingsService;

  //@ts-ignore
  getRepository() {
    return this.repository;
  }

  async add(bean: ProjectEntity) {
    const {name} = bean;
    if (!name) {
      throw new Error('项目名称不能为空');
    }
    const exist = await this.repository.findOne({
      where: {
        name,
        userId:0,
      },
    });
   if (exist) {
     throw new Error('项目名称已存在');
   }
   bean.userId = 0
   bean.disabled = false
   return await super.add(bean)
  }

  async setDisabled(id: number, disabled: boolean) {
    const project = await this.repository.findOne({
      where: {
        id,
        userId:0,
      },
    });
    if (!project) {
      throw new Error('项目不存在');
    }
    await this.repository.update({
      userId:0,
    }, {
      disabled,
    });
    project.disabled = disabled;
    await this.repository.save(project);
  }

  async getByUserId(userId: number) {

    const memberList = await this.projectMemberService.getByUserId(userId);
    const projectIds = memberList.map(item => item.projectId);
    const projectList = await this.repository.find({
      where: {
        id: In(projectIds),
      },
    });

    const memberPermissionMap = memberList.reduce((prev, cur) => {
      prev[cur.projectId] = cur.permission;
      return prev;
    }, {} as Record<number, string>);

    projectList.forEach(item => {
      item.permission = memberPermissionMap[item.id] || 'read';
    })

    return projectList
  }
}
