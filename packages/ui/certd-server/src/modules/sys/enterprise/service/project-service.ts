import { BaseService, SysSettingsService } from '@certd/lib-server';
import { Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
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
        userId: 0,
      },
    });
   if (exist) {
     throw new Error('项目名称已存在');
   }
   bean.disabled = false
   return await super.add(bean)
  }

  async setDisabled(id: number, disabled: boolean) {
    await this.repository.update({
      id,
      userId:0,
    }, {
      disabled,
    });
  }

  async getUserProjects(userId: number) {

    const memberList = await this.projectMemberService.getByUserId(userId);
    const projectIds = memberList.map(item => item.projectId);
    const projectList = await this.repository.createQueryBuilder('project')
      .where(' project.disabled = false')
      .where(' project.userId = :userId', { userId:0 })
      .where(' project.id IN (:...projectIds) or project.adminId = :userId', { projectIds, userId })
      .getMany();

    const memberPermissionMap = memberList.reduce((prev, cur) => {
      prev[cur.projectId] = cur.permission;
      return prev;
    }, {} as Record<number, string>);

    projectList.forEach(item => {
      if (item.adminId === userId) {
        item.permission = 'admin';
      }else{
        item.permission = memberPermissionMap[item.id] || 'read';
      }
    })

    return projectList
  }

  async checkAdminPermission({userId, projectId}: {userId: number, projectId: number}) {
    return await this.checkPermission({
      userId,
      projectId,
      permission: 'admin',
    })
  }
  async checkWritePermission({userId, projectId}: {userId: number, projectId: number}) {
    return await this.checkPermission({
      userId,
      projectId,
      permission: 'write',
    })
  }
  async checkReadPermission({userId, projectId}: {userId: number, projectId: number}) {
    return await this.checkPermission({
      userId,
      projectId,
      permission: 'read',
    })
  }

  async checkPermission({userId, projectId, permission}: {userId: number, projectId: number, permission: string}) {
   if (permission !== 'admin' && permission !== 'write' && permission !== 'read') {
     throw new Error('权限类型错误');
   }
   if (!userId ){
     throw new Error('用户ID不能为空');
   }
   if (!projectId ){
     throw new Error('项目ID不能为空');
   }
   const project = await this.findOne({
      select: ['id', 'userId', 'adminId', 'disabled'],
      where: {
        id: projectId,
      },
   });
    if (!project) {
      throw new Error('项目不存在');
    }
    if (project.adminId === userId) {
      //创建者拥有管理权限
      return true
    }
    if (project.disabled) {
      throw new Error('项目已禁用');
    }
    const member = await this.projectMemberService.getMember(projectId,userId);
    if (!member) {
      throw new Error('项目成员不存在');
    }
    if (permission === 'read') {
      return true
    }
    if (permission === 'write') {
      if (member.permission === 'admin' || member.permission === 'write') {
        return true
      }else{
        throw new Error('权限不足');
      }
    }
    if (member.permission !== permission) {
      throw new Error('权限不足');
    }
    return true
  }
}
