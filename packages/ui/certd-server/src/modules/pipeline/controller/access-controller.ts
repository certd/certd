import { ALL, Body, Controller, Inject, Post, Provide, Query } from '@midwayjs/core';
import { CrudController } from '@certd/lib-server';
import { AccessService } from '../service/access-service.js';
import { Constants } from '@certd/lib-server';

/**
 * 授权
 */
@Provide()
@Controller('/api/pi/access')
export class AccessController extends CrudController<AccessService> {
  @Inject()
  service: AccessService;

  userId() {
    return this.getUserId();
  }

  getService(): AccessService {
    return this.service;
  }

  @Post('/page', { summary: Constants.per.authOnly })
  async page(@Body(ALL) body) {
    body.query = body.query ?? {};
    body.query.userId = this.userId();
    return await super.page(body);
  }

  @Post('/list', { summary: Constants.per.authOnly })
  async list(@Body(ALL) body) {
    body.userId = this.userId();
    return super.list(body);
  }

  @Post('/add', { summary: Constants.per.authOnly })
  async add(@Body(ALL) bean) {
    bean.userId = this.userId();
    return super.add(bean);
  }

  @Post('/update', { summary: Constants.per.authOnly })
  async update(@Body(ALL) bean) {
    await this.service.checkUserId(bean.id, this.userId());
    return super.update(bean);
  }
  @Post('/info', { summary: Constants.per.authOnly })
  async info(@Query('id') id: number) {
    await this.service.checkUserId(id, this.userId());
    return super.info(id);
  }

  @Post('/delete', { summary: Constants.per.authOnly })
  async delete(@Query('id') id: number) {
    await this.service.checkUserId(id, this.userId());
    return super.delete(id);
  }

  @Post('/define', { summary: Constants.per.authOnly })
  async define(@Query('type') type: string) {
    const access = this.service.getDefineByType(type);
    return this.ok(access);
  }

  @Post('/accessTypeDict', { summary: Constants.per.authOnly })
  async getAccessTypeDict() {
    const list = this.service.getDefineList();
    const dict = [];
    for (const item of list) {
      if (item?.deprecated) {
        continue;
      }
      dict.push({
        value: item.name,
        label: item.title,
      });
    }
    return this.ok(dict);
  }
}
