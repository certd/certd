import { ApplicationContext, Inject } from '@midwayjs/core';
import type {IMidwayContainer} from  '@midwayjs/core';
import * as koa from '@midwayjs/koa';
import { Constants } from './constants.js';
import { isEnterprise } from './mode.js';


export abstract class BaseController {
  @Inject()
  ctx: koa.Context;

  @ApplicationContext()
  applicationContext: IMidwayContainer;

  /**
   * 成功返回
   * @param data 返回数据
   */
  ok(data?: any) {
    const res = {
      ...Constants.res.success,
      data: undefined,
    };
    if (data) {
      res.data = data;
    }
    return res;
  }
  /**
   * 失败返回
   * @param msg
   * @param code
   */
  fail(msg: string, code?: any) {
    return {
      code: code ? code : Constants.res.error.code,
      message: msg ? msg : Constants.res.error.code,
    };
  }

  getUserId() {
    const userId = this.ctx.user?.id;
    if (userId == null) {
      throw new Error('Token已过期');
    }
    return userId;
  }

  getLoginUser() {
    const user = this.ctx.user;
    if (user == null) {
      throw new Error('Token已过期');
    }
    return user;
  }

  isAdmin() {
    const roleIds: number[] = this.ctx?.user?.roles;
    if (roleIds?.includes(1)) {
      return true;
    }
  }

  async getProjectId(permission:string) {
    if (!isEnterprise()) {
      return null
    }
    let projectIdStr = this.ctx.headers["project-id"] as string;
    if (!projectIdStr){
      projectIdStr = this.ctx.request.query["projectId"] as string;
    }
    if (!projectIdStr) {
      //这里必须抛异常，否则可能会有权限问题
      throw new Error("projectId 不能为空")
    }
    const userId = this.getUserId()
    const projectId = parseInt(projectIdStr)
    await this.checkProjectPermission(userId, projectId,permission)
    return projectId;
  }

  async getProjectUserId(permission:string){
    let userId = this.getUserId()
    const projectId = await this.getProjectId(permission)
    if(projectId){
      userId = -1 // 企业管理模式下，用户id固定-1
    }
    return {
      projectId,userId
    }
  }
  async getProjectUserIdRead(){
    return await this.getProjectUserId("read")
  }
  async getProjectUserIdWrite(){
    return await this.getProjectUserId("write")
  }
  async getProjectUserIdAdmin(){
    return await this.getProjectUserId("admin")
  }

  async checkProjectPermission(userId: number, projectId: number,permission:string) {
    const projectService:any = await this.applicationContext.getAsync("projectService");
    await projectService.checkPermission({userId,projectId,permission})
  }

  /**
   * 
   * @param service 检查记录是否属于某用户或某项目
   * @param id 
   */
  async checkOwner(service:any,id:number,permission:string,allowAdmin:boolean = false){
    let { projectId,userId } = await this.getProjectUserId(permission)
    const authService:any = await this.applicationContext.getAsync("authService");
    if (projectId) {
      await authService.checkProjectId(service, id, projectId);
    }else{

      if(userId === 0){
        //系统级别，不检查权限
      }else{
        if(allowAdmin){
          await authService.checkUserIdButAllowAdmin(this.ctx, service, id);
        }else{
          await authService.checkUserId( service, id, userId);
        }
      }
     
    }
    return {projectId,userId}
  }

}
