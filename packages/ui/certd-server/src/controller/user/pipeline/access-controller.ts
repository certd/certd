import { ALL, Body, Controller, Inject, Post, Provide, Query } from '@midwayjs/core';
import { Constants, CrudController } from '@certd/lib-server';
import { AccessService } from '@certd/lib-server';
import { AuthService } from '../../../modules/sys/authority/service/auth-service.js';
import { AccessDefine } from '@certd/pipeline';

/**
 * 授权
 */
@Provide()
@Controller('/api/pi/access')
export class AccessController extends CrudController<AccessService> {
  @Inject()
  service: AccessService;
  @Inject()
  authService: AuthService;

  getService(): AccessService {
    return this.service;
  }

  @Post('/page', { summary: Constants.per.authOnly })
  async page(@Body(ALL) body) {
    body.query = body.query ?? {};
    delete body.query.userId;
    body.query.userId = this.getUserId()
    let name = body.query?.name;
    delete body.query.name;
    const buildQuery = qb => {
      if (name) {
        qb.andWhere('name like :name', { name: `%${name.trim()}%` });
      }
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
    body.query = body.query ?? {};
    body.query.userId = this.getUserId();
    return super.list(body);
  }

  @Post('/add', { summary: Constants.per.authOnly })
  async add(@Body(ALL) bean) {
    bean.userId = this.getUserId();
    return super.add(bean);
  }

  @Post('/update', { summary: Constants.per.authOnly })
  async update(@Body(ALL) bean) {
    await this.service.checkUserId(bean.id, this.getUserId());
    delete bean.userId;
    return super.update(bean);
  }
  @Post('/info', { summary: Constants.per.authOnly })
  async info(@Query('id') id: number) {
    await this.service.checkUserId(id, this.getUserId());
    return super.info(id);
  }

  @Post('/delete', { summary: Constants.per.authOnly })
  async delete(@Query('id') id: number) {
    await this.service.checkUserId(id, this.getUserId());
    return super.delete(id);
  }

  @Post('/define', { summary: Constants.per.authOnly })
  async define(@Query('type') type: string) {
    const access = this.service.getDefineByType(type);
    return this.ok(access);
  }

  @Post('/getSecretPlain', { summary: Constants.per.authOnly })
  async getSecretPlain(@Body(ALL) body: { id: number; key: string }) {
    const value = await this.service.getById(body.id, this.getUserId());
    return this.ok(value[body.key]);
  }

  @Post('/accessTypeDict', { summary: Constants.per.authOnly })
  async getAccessTypeDict() {
    let list: AccessDefine[] = this.service.getDefineList();
    list = list.sort((a,b) => {
      return (a.order??10) - (b.order??10);
    });
    const dict = [];
    for (const item of list) {
      dict.push({
        value: item.name,
        label: item.title,
        icon: item.icon,
      });
    }
    return this.ok(dict);
  }

  @Post('/simpleInfo', { summary: Constants.per.authOnly })
  async simpleInfo(@Query('id') id: number) {
    await this.authService.checkUserIdButAllowAdmin(this.ctx, this.service, id);
    const res = await this.service.getSimpleInfo(id);
    return this.ok(res);
  }

  @Post('/getDictByIds', { summary: Constants.per.authOnly })
  async getDictByIds(@Body('ids') ids: number[]) {
    const res = await this.service.getSimpleByIds(ids, this.getUserId());
    return this.ok(res);
  }
}
