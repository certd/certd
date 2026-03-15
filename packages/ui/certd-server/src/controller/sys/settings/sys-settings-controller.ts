import { ALL, Body, Controller, Inject, Post, Provide, Query, RequestIP } from "@midwayjs/core";
import {
  addonRegistry,
  AddonService,
  CrudController,
  SysPrivateSettings,
  SysPublicSettings,
  SysSafeSetting,
  SysSettingsEntity,
  SysSettingsService
} from "@certd/lib-server";
import { cloneDeep, merge } from "lodash-es";
import { PipelineService } from "../../../modules/pipeline/service/pipeline-service.js";
import { UserSettingsService } from "../../../modules/mine/service/user-settings-service.js";
import { getEmailSettings } from "../../../modules/sys/settings/fix.js";
import { http, logger, utils } from "@certd/basic";
import { CodeService } from "../../../modules/basic/service/code-service.js";
import { SmsServiceFactory } from "../../../modules/basic/sms/factory.js";


/**
 */
@Provide()
@Controller('/api/sys/settings')
export class SysSettingsController extends CrudController<SysSettingsService> {
  @Inject()
  service: SysSettingsService;
  @Inject()
  userSettingsService: UserSettingsService;
  @Inject()
  pipelineService: PipelineService;
  @Inject()
  codeService: CodeService;
 @Inject()
  addonService: AddonService;

  getService() {
    return this.service;
  }

  @Post('/page', { description: 'sys:settings:view' })
  async page(@Body(ALL) body) {
    return super.page(body);
  }

  @Post('/list', { description: 'sys:settings:view' })
  async list(@Body(ALL) body) {
    return super.list(body);
  }

  @Post('/add', { description: 'sys:settings:edit' })
  async add(@Body(ALL) bean) {
    return super.add(bean);
  }

  @Post('/update', { description: 'sys:settings:edit' })
  async update(@Body(ALL) bean) {
    await this.service.checkUserId(bean.id, this.getUserId());
    return super.update(bean);
  }
  @Post('/info', { description: 'sys:settings:view' })
  async info(@Query('id') id: number) {
    await this.service.checkUserId(id, this.getUserId());
    return super.info(id);
  }

  @Post('/delete', { description: 'sys:settings:edit' })
  async delete(@Query('id') id: number) {
    await this.service.checkUserId(id, this.getUserId());
    return super.delete(id);
  }

  @Post('/save', { description: 'sys:settings:edit' })
  async save(@Body(ALL) bean: SysSettingsEntity) {
    await this.service.save(bean);
    return this.ok({});
  }

  @Post('/get', { description: 'sys:settings:view' })
  async get(@Query('key') key: string) {
    const entity = await this.service.getByKey(key);
    return this.ok(entity);
  }

  // savePublicSettings
  @Post('/getEmailSettings', { description: 'sys:settings:view' })
  async getEmailSettings(@Body(ALL) body) {
    const conf = await getEmailSettings(this.service, this.userSettingsService);
    return this.ok(conf);
  }

   @Post('/getEmailTemplates', { description: 'sys:settings:view' })
  async getEmailTemplates(@Body(ALL) body) {
    const conf = await getEmailSettings(this.service, this.userSettingsService);
    const templates = conf.templates ||  {}

    const emailTemplateProviders = await this.addonService.getDefineList("emailTemplate")

    const proviers = []
    for (const item of emailTemplateProviders) {
      const templateConf = templates[item.name] || {}
      proviers.push({
        name: item.name,
        title: item.title,
        addonId : templateConf.addonId,
      })
    }
    return this.ok(proviers);
  }

  @Post('/saveEmailSettings', { description: 'sys:settings:edit' })
  async saveEmailSettings(@Body(ALL) body) {
    const conf = await getEmailSettings(this.service, this.userSettingsService);
    merge(conf, body);
    await this.service.saveSetting(conf);
    return this.ok(conf);
  }

  @Post('/getSysSettings', { description: 'sys:settings:view' })
  async getSysSettings() {
    const publicSettings = await this.service.getPublicSettings();
    let privateSettings = await this.service.getPrivateSettings();
    privateSettings = privateSettings.removeSecret();
    return this.ok({ public: publicSettings, private: privateSettings });
  }

  // savePublicSettings
  @Post('/saveSysSettings', { description: 'sys:settings:edit' })
  async saveSysSettings(@Body(ALL) body: { public: SysPublicSettings; private: SysPrivateSettings }) {
    const publicSettings = await this.service.getPublicSettings();
    const privateSettings = await this.service.getPrivateSettings();
    merge(publicSettings, body.public);
    merge(privateSettings, body.private);
    await this.service.savePublicSettings(publicSettings);
    await this.service.savePrivateSettings(privateSettings);
    return this.ok({});
  }
  @Post('/stopOtherUserTimer', { description: 'sys:settings:edit' })
  async stopOtherUserTimer(@Body(ALL) body) {
    await this.pipelineService.stopOtherUserPipeline(1);
    return this.ok({});
  }

  @Post('/testProxy', { description: 'sys:settings:edit' })
  async testProxy(@Body(ALL) body) {
    const google = 'https://www.google.com/';
    const baidu = 'https://www.baidu.com/';
    let googleRes = false;
    try {
      await http.request({
        url: google,
        method: 'GET',
        timeout: 5000,
        logRes: false,
        logParams: false,
      });
      googleRes = true;
    } catch (e) {
      googleRes = e.message;
      logger.info('test google error:', e);
    }
    let baiduRes = false;
    try {
      await http.request({
        url: baidu,
        method: 'GET',
        timeout: 5000,
        logRes: false,
        logParams: false,
      });
      baiduRes = true;
    } catch (e) {
      baiduRes = e.message;
      logger.info('test baidu error:', e);
    }
    return this.ok({
      google: googleRes,
      baidu: baiduRes,
    });
  }

  @Post('/testSms', { description: 'sys:settings:edit' })
  async testSms(@Body(ALL) body) {
    await this.codeService.sendSmsCode(body.phoneCode, body.mobile );
    return this.ok({});
  }

  @Post('/getSmsTypeDefine', { description: 'sys:settings:view' })
  async getSmsTypeDefine(@Body('type') type: string) {
    const define =await SmsServiceFactory.getDefine(type);
    return this.ok(define);
  }



  @Post("/safe/get", { description: "sys:settings:view" })
  async safeGet() {
    const res = await this.service.getSetting<SysSafeSetting>(SysSafeSetting);
    const clone:SysSafeSetting = cloneDeep(res);
    delete clone.hidden?.openPassword;
    return this.ok(clone);
  }

  @Post("/safe/save", { description: "sys:settings:edit" })
  async safeSave(@Body(ALL) body: any) {
    if(body.hidden.openPassword){
      body.hidden.openPassword = utils.hash.md5(body.hidden.openPassword);
    }
    const blankSetting = new SysSafeSetting()
    const setting = await this.service.getSetting<SysSafeSetting>(SysSafeSetting);
    const newSetting = merge(blankSetting,cloneDeep(setting), body);
    if(newSetting.hidden?.enabled && !newSetting.hidden?.openPassword){
      throw new Error("首次设置需要填写解锁密码")
    }
    await this.service.saveSetting(blankSetting);
    return this.ok({});
  }


  @Post("/captchaTest", { description: "sys:settings:edit" })
  async captchaTest(@Body(ALL) body: any,@RequestIP() remoteIp: string) {
    await this.codeService.checkCaptcha(body,{remoteIp});
    return this.ok({});
  }

  @Post('/oauth/providers', { description: 'sys:settings:view' })
  async oauthProviders() {
    const list = await addonRegistry.getDefineList("oauth");
    return this.ok(list);
  }
}
