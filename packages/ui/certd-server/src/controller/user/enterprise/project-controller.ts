import { BaseController, Constants } from '@certd/lib-server';
import { ALL, Body, Controller, Inject, Post, Provide } from '@midwayjs/core';
import { AuthService } from '../../../modules/sys/authority/service/auth-service.js';
import { ProjectService } from '../../../modules/sys/enterprise/service/project-service.js';
import { ProjectMemberService } from '../../../modules/sys/enterprise/service/project-member-service.js';

/**
 */
@Provide()
@Controller('/api/enterprise/project')
export class UserProjectController extends BaseController {
  @Inject()
  service: ProjectService;

  @Inject()
  projectMemberService: ProjectMemberService;
  
  @Inject()
  authService: AuthService;

  getService(): ProjectService {
    return this.service;
  }

   /**
   * @param body 
   * @returns 
   */
  @Post('/detail', { summary: Constants.per.authOnly })
  async detail(@Body(ALL) body: any) {
    const {projectId} = await this.getProjectUserIdRead();
    const res = await this.service.getDetail(projectId,this.getUserId());
    return this.ok(res);
  }


  /**
   * 我的项目
   * @param body 
   * @returns 
   */
  @Post('/list', { summary: Constants.per.authOnly })
  async list(@Body(ALL) body: any) {
    const userId= this.getUserId();
    const res = await this.service.getUserProjects(userId);
    return this.ok(res);
  }


  /**
   * 
   * @param body 所有项目
   * @returns 
   */
  @Post('/all', { summary: Constants.per.authOnly })
  async all(@Body(ALL) body: any) {
    const userId= this.getUserId();
    const res = await this.service.getAllWithStatus(userId);
    return this.ok(res);
  }

  @Post('/applyJoin', { summary: Constants.per.authOnly })
  async applyJoin(@Body(ALL) body: any) {
    const userId= this.getUserId();
    const res = await this.service.applyJoin({ userId, projectId: body.projectId });
    return this.ok(res);
  }

  @Post('/updateMember', { summary: Constants.per.authOnly })
  async updateMember(@Body(ALL) body: any) {
    const {projectId} = await this.getProjectUserIdAdmin();
    const {status,permission,userId} = body;
    const member = await this.projectMemberService.findOne({
      where: {
        projectId,
        userId,
      },
    });
    if (!member) {
      throw new Error('成员不存在');
    }
    const res = await this.projectMemberService.update({
      id: member.id,
      status,
      permission,
    });
    return this.ok(res);
  }

  @Post('/approveJoin', { summary: Constants.per.authOnly })
  async approveJoin(@Body(ALL) body: any) {
    const {projectId} = await this.getProjectUserIdAdmin();
    const {status,permission,userId} = body;
    const res = await this.service.approveJoin({ userId, projectId: projectId,status,permission });
    return this.ok(res);
  }

  @Post('/delete', { summary: Constants.per.authOnly })
  async delete(@Body(ALL) body: any) {
     const {projectId} = await this.getProjectUserIdAdmin();
    await this.projectMemberService.deleteWhere({
      projectId,
      userId: this.getUserId(),
    });
    return this.ok();
  }

  @Post('/leave', { summary: Constants.per.authOnly })
  async leave(@Body(ALL) body: any) {
    const {projectId}  = body
     const userId = this.getUserId();
    await this.projectMemberService.deleteWhere({
      projectId,
      userId,
    });
    return this.ok();
  }

}
