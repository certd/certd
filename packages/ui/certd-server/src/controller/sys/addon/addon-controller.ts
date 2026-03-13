import { ALL, Body, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import { AddonRequestHandleReq, AddonService, Constants } from "@certd/lib-server";
import { AddonController } from "../../user/addon/addon-controller.js";

@Provide()
@Controller('/api/sys/addon')
export class SysAddonController extends AddonController {
  @Inject()
  service2: AddonService;

  getService(): AddonService {
    return this.service2;
  }

  async getProjectUserId(permission:string){
    return {
      projectId:null,userId:0  //0为系统级别
    }
  }
  getUserId() {
    // checkComm();
    return 0;
  }

  @Post('/page', { summary: 'sys:settings:view' })
  async page(@Body(ALL) body: any) {
    return await super.page(body);
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
  @Post('/define', { summary: Constants.per.authOnly })
  async define(@Query('type') type: string,@Query('addonType') addonType: string) {
    return await super.define(type,addonType);
  }

  @Post('/getTypeDict', { summary: Constants.per.authOnly })
  async getTypeDict(@Query('addonType') addonType: string) {
    return await super.getTypeDict(addonType);
  }

  @Post('/simpleInfo', { summary: Constants.per.authOnly })
  async simpleInfo(@Query('addonType') addonType: string,@Query('id') id: number) {
    return await super.simpleInfo(addonType,id);
  }

  @Post('/getDefaultId', { summary: Constants.per.authOnly })
  async getDefaultId(@Query('addonType') addonType: string) {
   return await super.getDefaultId(addonType);
  }

  @Post('/setDefault', { summary: Constants.per.authOnly })
  async setDefault(@Query('addonType') addonType: string,@Query('id') id: number) {
    return await super.setDefault(addonType,id);
  }


  @Post('/options', { summary: Constants.per.authOnly })
  async options(@Query('addonType') addonType: string) {
    return await super.options(addonType);
  }

  @Post('/handle', { summary: Constants.per.authOnly })
  async handle(@Body(ALL) body: AddonRequestHandleReq) {
   return await super.handle(body);
  }
}
