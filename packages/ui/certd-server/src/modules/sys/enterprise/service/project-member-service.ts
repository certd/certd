import {Inject, Provide, Scope, ScopeEnum} from '@midwayjs/core';
import {BaseService, SysSettingsService} from '@certd/lib-server';
import {InjectEntityModel} from '@midwayjs/typeorm';
import {Repository} from 'typeorm';
import { ProjectMemberEntity } from '../entity/project-member.js';

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

  async add(bean: ProjectMemberEntity) {
    const {projectId, userId} = bean;
    if (!projectId) {
      throw new Error('项目ID不能为空');
    }
    if (!userId) {
      throw new Error('用户ID不能为空');
    }
    const exist = await this.repository.findOne({
      where: {
        projectId,
        userId,
      },
    });
   if (exist) {
     throw new Error('项目用户已存在');
   }
   return await super.add(bean)
  }

}
