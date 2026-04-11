import { BaseService, Constants, SysSettingsService } from '@certd/lib-server';
import { Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { LRUCache } from 'lru-cache';
import { Repository } from 'typeorm';
import { ProjectEntity, ProjectMemberItem } from '../entity/project.js';
import { ProjectMemberService } from './project-member-service.js';

const projectCache = new LRUCache<string, any>({
  max: 1000,
  ttl: 1000 * 60 * 10,
});

const ENTERPRISE_USER_ID = Constants.enterpriseUserId; //企业模式下 企业userId 固定为-1

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
    const { name } = bean;
    if (!name) {
      throw new Error('项目名称不能为空');
    }
    const exist = await this.repository.findOne({
      where: {
        name,
        userId: ENTERPRISE_USER_ID,
      },
    });
    if (exist) {
      throw new Error('项目名称已存在');
    }
    bean.disabled = false
    const res = await super.add(bean)
    projectCache.clear();
    return res;
  }

  async update(bean: ProjectEntity) {
    const res = await super.update(bean)
    projectCache.clear();
    return res;
  }

  async setDisabled(id: number, disabled: boolean) {
    await this.repository.update({
      id,
      userId: ENTERPRISE_USER_ID,
    }, {
      disabled,
    });
  }

  async getUserProjects(userId: number) {

    const memberList = await this.projectMemberService.getByUserId(userId, 'approved');
    let projectIds = memberList.map(item => item.projectId); 
    if (!projectIds || projectIds.length === 0) {
      projectIds = [0]
    }
    const projectList = await this.repository.createQueryBuilder('project')
      .where(' project.disabled = false')
      .where(' project.userId = :userId', { userId: ENTERPRISE_USER_ID })
      .where(' project.id IN (:...projectIds) or project.adminId = :userId', { projectIds, userId })
      .getMany();

    const memberPermissionMap = memberList.reduce((prev, cur) => {
      prev[cur.projectId] = cur.permission;
      return prev;
    }, {} as Record<number, string>);

    projectList.forEach(item => {
      if (item.adminId === userId) {
        item.permission = 'admin';
      } else {
        item.permission = memberPermissionMap[item.id] || 'read';
      }
    })

    return projectList
  }

  async getAllWithStatus(userId: number): Promise<ProjectMemberItem[]> {
    let projectList: any = await this.find({
      where: {
        disabled: false,
        userId: ENTERPRISE_USER_ID,
      },
    })
    const projectMemberItemList: ProjectMemberItem[] = projectList

    const memberList = await this.projectMemberService.getByUserId(userId);

    const memberMap = memberList.reduce((prev, cur) => {
      prev[cur.projectId] = cur as any;
      return prev;
    }, {} as Record<number, ProjectMemberItem>);

    projectMemberItemList.forEach(item => {
      if (item.adminId === userId) {
        item.permission = 'admin';
        item.status = 'approved';
        item.memberId = userId
      } else {
        const memberItem: any = memberMap[item.id]
        if (memberItem) {
          item.permission = memberItem.permission;
          item.status = memberItem.status;
          item.memberId = memberItem.userId
        }
      }
    })
    return projectMemberItemList
  }


  async getDetail(projectId: number, userId?: number): Promise<ProjectMemberItem[]> {
    const project: any = await this.info(projectId);
    if (!project) {
      throw new Error('项目不存在');
    }
    if (project.adminId === userId) {
      project.permission = 'admin';
      project.status = 'approved';
      project.memberId = userId
    } else {
      const member = await this.projectMemberService.getMember(projectId, userId);
      if (member) {
        project.permission = member.permission;
        project.status = member.status;
        project.memberId = member.userId
      }
    }
    return project
  }

  async checkAdminPermission({ userId, projectId }: { userId: number, projectId: number }) {
    return await this.checkPermission({
      userId,
      projectId,
      permission: 'admin',
    })
  }
  async checkWritePermission({ userId, projectId }: { userId: number, projectId: number }) {
    return await this.checkPermission({
      userId,
      projectId,
      permission: 'write',
    })
  }
  async checkReadPermission({ userId, projectId }: { userId: number, projectId: number }) {
    return await this.checkPermission({
      userId,
      projectId,
      permission: 'read',
    })
  }

  async checkPermission({ userId, projectId, permission }: { userId: number, projectId: number, permission: string }) {
    if (permission !== 'admin' && permission !== 'write' && permission !== 'read') {
      throw new Error('权限类型错误');
    }
    if (!userId) {
      throw new Error('用户ID不能为空');
    }
    if (!projectId) {
      throw new Error('项目ID不能为空');
    }

    if (userId === ENTERPRISE_USER_ID) {
      return true
    }

    const cacheKey = `projectPermission:${projectId}:${userId}`
    let savedPermission = projectCache.get(cacheKey);

    if (!savedPermission) {
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
        savedPermission = 'admin';
      } else {
        if (project.disabled) {
          throw new Error('项目已禁用');
        }
        const member = await this.projectMemberService.getMember(projectId, userId);
        if (!member || member.status !== 'approved') {
          throw new Error(`用户${userId}还不是项目${projectId}的成员`);
        }
        savedPermission = member.permission;
      }
    }
    projectCache.set(cacheKey, savedPermission, { ttl: 3 * 60 * 1000 });
    if (!savedPermission) {
      throw new Error(`权限不足，需要${permission}权限`);
    }

    if (permission === 'read') {
      return true
    }
    if (permission === 'write') {
      if (savedPermission === 'admin' || savedPermission === 'write') {
        return true
      } else {
        throw new Error(`权限不足，需要${permission}权限`);
      }
    }
    if (savedPermission !== permission) {
      throw new Error(`权限不足，需要${permission}权限`);
    }
    return true
  }


  async applyJoin({ userId, projectId }: { userId: number, projectId: number }) {
    const project = await this.info(projectId);
    if (!project) {
      throw new Error('项目不存在');
    }
    if (project.disabled) {
      throw new Error('项目已禁用');
    }
    if (project.adminId === userId) {
      throw new Error('申请用户已经是该项目的管理员');
    }
    const member = await this.projectMemberService.getMember(projectId, userId);
    if (member && member.status === 'approved') {
      throw new Error('用户已加入项目');
    }
    if (member) {
      this.projectMemberService.update({
        id: member.id,
        status: 'pending',
      })
    } else {
      // 加入项目
      await this.projectMemberService.add({
        userId,
        projectId,
        permission: 'read',
        status: 'pending',
      })
    }
  }

  async approveJoin({ userId, projectId, status, permission }: { userId: number, projectId: number, status: string, permission: string }) {
    const member = await this.projectMemberService.getMember(projectId, userId);
    if (!member) {
      throw new Error('找不到用户的申请记录');
    }

    await this.projectMemberService.update({
      id: member.id,
      status: status,
      permission,
    })
  }

   async isAdmin(projectId: number): Promise<boolean> {
    const project = await this.info(projectId);
    return project?.isSystem ?? false;
  }


  async getAllProjectIds() {
    const projects = await this.repository.find({
      select: ['id'],
      where: {
        disabled: false,
      },
    })
    return projects.map(item => item.id);
  }
}
