import { BaseController, Constants } from '@certd/lib-server';
import { ALL, Body, Controller, Inject, Post, Provide } from '@midwayjs/core';
import { AuthService } from '../../../modules/sys/authority/service/auth-service.js';
import { ProjectService } from '../../../modules/sys/enterprise/service/project-service.js';

/**
 */
@Provide()
@Controller('/api/enterprise/project')
export class UserProjectController extends BaseController {
  @Inject()
  service: ProjectService;
  @Inject()
  authService: AuthService;

  getService(): ProjectService {
    return this.service;
  }

  @Post('/list', { summary: Constants.per.authOnly })
  async list(@Body(ALL) body: any) {
    const userId= this.getUserId();
    const res = await this.service.getByUserId(userId);
    return this.ok(res);
  }

}
