import { ALL, Body, Controller, Inject, Post, Provide, Query } from '@midwayjs/core';
import { AccessService } from '../../../modules/pipeline/service/access-service.js';
import { AccessController } from '../../pipeline/access-controller.js';
import { checkComm } from '@certd/pipeline';

/**
 * 授权
 */
@Provide()
@Controller('/api/sys/access')
export class SysAccessController extends AccessController {
  @Inject()
  service2: AccessService;

  getService(): AccessService {
    return this.service2;
  }

  userId() {
    checkComm();
    return 0;
  }

  @Post('/page', { summary: 'sys:settings:view' })
  async page(@Body(ALL) body: any) {
    return await await super.page(body);
  }

  @Post('/list', { summary: 'sys:settings:view' })
  async list(@Body(ALL) body: any) {
    return await super.list(body);
  }

  @Post('/add', { summary: 'sys:settings:edit' })
  async add(@Body(ALL) bean: any) {
    return await super.add(bean);
  }

  @Post('/update', { summary: 'sys:settings:edit' })
  async update(@Body(ALL) bean: any) {
    return await super.update(bean);
  }
  @Post('/info', { summary: 'sys:settings:view' })
  async info(@Query('id') id: number) {
    return await super.info(id);
  }

  @Post('/delete', { summary: 'sys:settings:edit' })
  async delete(@Query('id') id: number) {
    return await super.delete(id);
  }

  @Post('/define', { summary: 'sys:settings:view' })
  async define(@Query('type') type: string) {
    return await super.define(type);
  }

  @Post('/accessTypeDict', { summary: 'sys:settings:view' })
  async getAccessTypeDict() {
    return await super.getAccessTypeDict();
  }
}
