import {Inject, Provide, Scope, ScopeEnum} from '@midwayjs/core';
import {BaseService, SysSettingsService} from '@certd/lib-server';
import {InjectEntityModel} from '@midwayjs/typeorm';
import {Repository} from 'typeorm';
import { ProjectEntity } from '../entity/project.js';

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class ProjectService extends BaseService<ProjectEntity> {
  @InjectEntityModel(ProjectEntity)
  repository: Repository<ProjectEntity>;


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
}
