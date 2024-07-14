import {
  ALL,
  Body,
  Controller,
  Inject,
  Post,
  Provide,
  Query,
} from '@midwayjs/core';
import { CrudController } from '../../../basic/crud-controller.js';
import { AccessService } from '../service/access-service.js';
import { Constants } from '../../../basic/constants.js';

/**
 * 授权
 */
@Provide()
@Controller('/api/pi/access')
export class AccessController extends CrudController<AccessService> {
  @Inject()
  service: AccessService;

  getService() {
    return this.service;
  }

  @Post('/page', { summary: Constants.per.authOnly })
  async page(@Body(ALL) body) {
    body.query = body.query ?? {};
    body.query.userId = this.ctx.user.id;
    return super.page(body);
  }

  @Post('/list', { summary: Constants.per.authOnly })
  async list(@Body(ALL) body) {
    body.userId = this.ctx.user.id;
    return super.list(body);
  }

  @Post('/add', { summary: Constants.per.authOnly })
  async add(@Body(ALL) bean) {
    bean.userId = this.ctx.user.id;
    return super.add(bean);
  }

  @Post('/update', { summary: Constants.per.authOnly })
  async update(@Body(ALL) bean) {
    await this.service.checkUserId(bean.id, this.ctx.user.id);
    return super.update(bean);
  }
  @Post('/info', { summary: Constants.per.authOnly })
  async info(@Query('id') id) {
    await this.service.checkUserId(id, this.ctx.user.id);
    return super.info(id);
  }

  @Post('/delete', { summary: Constants.per.authOnly })
  async delete(@Query('id') id) {
    await this.service.checkUserId(id, this.ctx.user.id);
    return super.delete(id);
  }

  @Post('/define', { summary: Constants.per.authOnly })
  async define(@Query('type') type) {
    const access = this.service.getDefineByType(type);
    return this.ok(access);
  }

  @Post('/accessTypeDict', { summary: Constants.per.authOnly })
  async getAccessTypeDict() {
    const list = this.service.getDefineList();
    const dict = [];
    for (const item of list) {
      dict.push({
        value: item.name,
        label: item.title,
      });
    }
    return this.ok(dict);
  }
}
