import { ALL, Body, Controller, Inject, Post, Provide, Query } from '@midwayjs/core';
import { Constants, CrudController, ValidateException } from '@certd/lib-server';
import { NotificationService } from '../../../modules/pipeline/service/notification-service.js';
import { AuthService } from '../../../modules/sys/authority/service/auth-service.js';
import { NotificationDefine } from '@certd/pipeline';
import { checkPlus } from '@certd/plus-core';
import { ApiTags } from '@midwayjs/swagger';

/**
 * 通知
 */
@Provide()
@Controller('/api/pi/notification')
@ApiTags(['pipeline-notification'])
export class NotificationController extends CrudController<NotificationService> {
  @Inject()
  service: NotificationService;
  @Inject()
  authService: AuthService;

  getService(): NotificationService {
    return this.service;
  }

  @Post('/page', { summary: Constants.per.authOnly })
  async page(@Body(ALL) body) {
    const {projectId,userId} = await this.getProjectUserIdRead();
    body.query = body.query ?? {};
    delete body.query.userId;
    body.query.projectId = projectId;
    const buildQuery = qb => {
      qb.andWhere('user_id = :userId', { userId:  userId});
    };
    const res = await this.service.page({
      query: body.query,
      page: body.page,
      sort: body.sort,
      buildQuery,
    });
    return this.ok(res);
  }

  @Post('/list', { summary: Constants.per.authOnly })
  async list(@Body(ALL) body) {
    const {projectId,userId} = await this.getProjectUserIdRead();
    body.query = body.query ?? {};
    body.query.userId = userId;
    body.query.projectId = projectId;
    return super.list(body);
  }

  @Post('/add', { summary: Constants.per.authOnly })
  async add(@Body(ALL) bean) {
    const {projectId,userId} = await this.getProjectUserIdRead();
    bean.userId = userId;
    bean.projectId = projectId;
    const type = bean.type;
    const define: NotificationDefine = this.service.getDefineByType(type);
    if (!define) {
      throw new ValidateException('通知类型不存在');
    }
    if (define.needPlus) {
      checkPlus();
    }
    return super.add(bean);
  }

  @Post('/update', { summary: Constants.per.authOnly })
  async update(@Body(ALL) bean) {
    await this.checkOwner(this.getService(), bean.id,"write");
    const old = await this.service.info(bean.id);
    if (!old) {
      throw new ValidateException('通知配置不存在');
    }
    if (old.type !== bean.type) {
      const type = bean.type;
      const define: NotificationDefine = this.service.getDefineByType(type);
      if (!define) {
        throw new ValidateException('通知类型不存在');
      }
      if (define.needPlus) {
        checkPlus();
      }
    }
    delete bean.userId;
    delete bean.projectId;
    return super.update(bean);
  }
  @Post('/info', { summary: Constants.per.authOnly })
  async info(@Query('id') id: number) {
    await this.checkOwner(this.getService(), id,"read");
    return super.info(id);
  }

  @Post('/delete', { summary: Constants.per.authOnly })
  async delete(@Query('id') id: number) {
    await this.checkOwner(this.getService(), id,"write");
    return super.delete(id);
  }

  @Post('/define', { summary: Constants.per.authOnly })
  async define(@Query('type') type: string) {
    const notification = this.service.getDefineByType(type);
    return this.ok(notification);
  }

  @Post('/getTypeDict', { summary: Constants.per.authOnly })
  async getTypeDict() {
    const list: any = this.service.getDefineList();
    let dict = [];
    for (const item of list) {
      dict.push({
        value: item.name,
        label: item.title,
        needPlus: item.needPlus ?? false,
        icon: item.icon,
      });
    }
    dict = dict.sort(a => {
      return a.order ? 0 : -1;
    });
    dict = dict.sort(a => {
      return a.needPlus ? 0 : -1;
    });
    return this.ok(dict);
  }

  @Post('/simpleInfo', { summary: Constants.per.authOnly })
  async simpleInfo(@Query('id') id: number) {
    const {projectId,userId} = await this.getProjectUserIdRead();
    if (id === 0) {
      //获取默认
      const res = await this.service.getDefault(userId,projectId);
      if (!res) {
        throw new ValidateException('默认通知配置不存在');
      }
      const simple = await this.service.getSimpleInfo(res.id);
      return this.ok(simple);
    }
    await this.checkOwner(this.getService(), id,"read",true);
    const res = await this.service.getSimpleInfo(id);
    return this.ok(res);
  }

  @Post('/getDefaultId', { summary: Constants.per.authOnly })
  async getDefaultId() {
    const {projectId,userId} = await this.getProjectUserIdRead();
    const res = await this.service.getDefault(userId,projectId);
    return this.ok(res?.id);
  }

  @Post('/setDefault', { summary: Constants.per.authOnly })
  async setDefault(@Query('id') id: number) {
    const {projectId,userId} = await this.getProjectUserIdRead();
    await this.checkOwner(this.getService(), id,"write");
    const res = await this.service.setDefault(id, userId,projectId);
    return this.ok(res);
  }

  @Post('/getOrCreateDefault', { summary: Constants.per.authOnly })
  async getOrCreateDefault(@Body('email') email: string) {
    const {projectId,userId} = await this.getProjectUserIdRead();
    const res = await this.service.getOrCreateDefault(email, userId,projectId);
    return this.ok(res);
  }

  @Post('/options', { summary: Constants.per.authOnly })
  async options() {
    const {projectId,userId} = await this.getProjectUserIdRead();
    const res = await this.service.list({
      query: {
        userId: userId,
        projectId: projectId,
      },
    });
    for (const item of res) {
      delete item.setting;
    }
    return this.ok(res);
  }
}
