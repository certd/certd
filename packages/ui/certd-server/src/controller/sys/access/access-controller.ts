import { AccessService } from "@certd/lib-server";
import { ALL, Body, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import { AccessController } from "../../user/pipeline/access-controller.js";

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

  async getProjectUserId(permission:string){
    return {
      projectId:null,userId:0
    }
  }

  getUserId() {
    // checkComm();
    return 0;
  }

  @Post('/page', { description: 'sys:settings:view' })
  async page(@Body(ALL) body: any) {
    return await super.page(body);
  }

  @Post('/list', { description: 'sys:settings:view' })
  async list(@Body(ALL) body: any) {
    return await super.list(body);
  }

  @Post('/add', { description: 'sys:settings:edit' })
  async add(@Body(ALL) bean: any) {
    return await super.add(bean);
  }

  @Post('/update', { description: 'sys:settings:edit' })
  async update(@Body(ALL) bean: any) {
    return await super.update(bean);
  }
  @Post('/info', { description: 'sys:settings:view' })
  async info(@Query('id') id: number) {
    return await super.info(id);
  }

  @Post('/delete', { description: 'sys:settings:edit' })
  async delete(@Query('id') id: number) {
    return await super.delete(id);
  }

  @Post('/define', { description: 'sys:settings:view' })
  async define(@Query('type') type: string) {
    return await super.define(type);
  }

  @Post('/getSecretPlain', { description: 'sys:settings:view' })
  async getSecretPlain(@Body(ALL) body: { id: number; key: string }) {
    const value = await this.service.getById(body.id, 0);
    return this.ok(value[body.key]);
  }

  @Post('/accessTypeDict', { description: 'sys:settings:view' })
  async getAccessTypeDict() {
    return await super.getAccessTypeDict();
  }

  @Post('/simpleInfo', { description: 'sys:settings:view' })
  async simpleInfo(@Query('id') id: number) {
    return await super.simpleInfo(id);
  }

    @Post('/getDictByIds', { description: 'sys:settings:view' })
    async getDictByIds(@Body('ids') ids: number[]) {
      return await super.getDictByIds(ids);
    }
}
