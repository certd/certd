import { ALL, Body, Controller, Inject, Post, Provide, Query } from '@midwayjs/core';
import { CrudController } from '@certd/lib-server';
import { merge } from 'lodash-es';
import { CnameProviderService } from '../../../modules/cname/service/cname-provider-service.js';

/**
 * 授权
 */
@Provide()
@Controller('/api/sys/cname/provider')
export class CnameRecordController extends CrudController<CnameProviderService> {
  @Inject()
  service: CnameProviderService;

  getService(): CnameProviderService {
    return this.service;
  }

  @Post('/page', { summary: 'sys:settings:view' })
  async page(@Body(ALL) body: any) {
    body.query = body.query ?? {};
    return await super.page(body);
  }

  @Post('/list', { summary: 'sys:settings:view' })
  async list(@Body(ALL) body: any) {
    return super.list(body);
  }

  @Post('/add', { summary: 'sys:settings:edit' })
  async add(@Body(ALL) bean: any) {
    const def: any = {
      isDefault: false,
      disabled: false,
    };
    merge(bean, def);
    return super.add(bean);
  }

  @Post('/update', { summary: 'sys:settings:edit' })
  async update(@Body(ALL) bean: any) {
    return super.update(bean);
  }

  @Post('/info', { summary: 'sys:settings:view' })
  async info(@Query('id') id: number) {
    return super.info(id);
  }

  @Post('/delete', { summary: 'sys:settings:edit' })
  async delete(@Query('id') id: number) {
    return super.delete(id);
  }

  @Post('/deleteByIds', { summary: 'sys:settings:edit' })
  async deleteByIds(@Body(ALL) body: { ids: number[] }) {
    const res = await this.service.delete(body.ids);
    return this.ok(res);
  }

  @Post('/setDefault', { summary: 'sys:settings:edit' })
  async setDefault(@Body('id') id: number) {
    await this.service.setDefault(id);
    return this.ok();
  }

  @Post('/setDisabled', { summary: 'sys:settings:edit' })
  async setDisabled(@Body('id') id: number, @Body('disabled') disabled: boolean) {
    await this.service.setDisabled(id, disabled);
    return this.ok();
  }
}
