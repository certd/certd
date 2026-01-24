import {Autoload, Config, Init, Inject, Scope, ScopeEnum} from '@midwayjs/core';
import {PipelineService} from '../pipeline/service/pipeline-service.js';
import {logger} from '@certd/basic';
import {SysSettingsService, SysSiteInfo} from '@certd/lib-server';
import {SiteInfoService} from '../monitor/index.js';
import {Cron} from '../cron/cron.js';
import {UserSettingsService} from "../mine/service/user-settings-service.js";
import {UserSiteMonitorSetting} from "../mine/service/models.js";
import {getPlusInfo, isPlus} from "@certd/plus-core";
import dayjs from "dayjs";
import {NotificationService} from "../pipeline/service/notification-service.js";
import {UserService} from "../sys/authority/service/user-service.js";
import {Between} from "typeorm";
import { DomainService } from '../cert/service/domain-service.js';

@Autoload()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class AutoCRegisterCron {
  @Inject()
  pipelineService: PipelineService;

  @Config('cron.onlyAdminUser')
  private onlyAdminUser: boolean;

  @Config('cron.immediateTriggerOnce')
  private immediateTriggerOnce = false;

  @Config('cron.immediateTriggerSiteMonitor')
  private immediateTriggerSiteMonitor = false;

  @Inject()
  sysSettingsService: SysSettingsService;
  @Inject()
  userSettingsService: UserSettingsService;

  @Inject()
  siteInfoService: SiteInfoService;

  @Inject()
  cron: Cron;

  @Inject()
  notificationService: NotificationService;

  @Inject()
  userService: UserService;

  @Inject()
  domainService: DomainService;


  @Init()
  async init() {
    logger.info('加载定时trigger开始');
    await this.pipelineService.onStartup(this.immediateTriggerOnce, this.onlyAdminUser);
    logger.info('加载定时trigger完成');
    //
    // const meta = getClassMetadata(CLASS_KEY, this.echoPlugin);
    // console.log('meta', meta);
    // const metas = listPropertyDataFromClass(CLASS_KEY, this.echoPlugin);
    // console.log('metas', metas);
    await this.registerSiteMonitorCron();


    await this.registerPlusExpireCheckCron();

    await this.registerUserExpireCheckCron();

    await this.registerDomainExpireCheckCron();
  }

  async registerSiteMonitorCron() {
    //先注册公共job
    await this.siteInfoService.registerSiteMonitorJob()

    //注册用户独立的检查时间
    const monitorSettingList = await this.userSettingsService.list({
      query:{
        key: UserSiteMonitorSetting.__key__,
      }
    })
    for (const item of monitorSettingList) {
      const setting = item.setting ? JSON.parse(item.setting):{}
      if(!setting?.cron){
        continue
      }
      await this.siteInfoService.registerSiteMonitorJob(item.userId)
    }

    if (this.immediateTriggerSiteMonitor) {
      logger.info(`立即触发一次站点证书检查任务`)
      await this.siteInfoService.triggerJobOnce()
    }
  }

  registerPlusExpireCheckCron(){
    // 添加plus即将到期检查任务
    this.cron.register({
      name: 'plus-expire-check',
      cron: `0 10 9 * * *`, // 一天只能检查一次，否则会重复发送通知
      job: async () => {
        const plusInfo = getPlusInfo()
        if (!plusInfo.originVipType || plusInfo.originVipType==="free" ) {
          return
        }
        let label ="专业版"
        if( plusInfo.originVipType === 'comm'){
          label = "商业版"
        }
        const siteInfo = await this.sysSettingsService.getSetting<SysSiteInfo>(SysSiteInfo)

        const appTitle = siteInfo.title || "certd"
        const expiresDate = dayjs(plusInfo.expireTime).format("YYYY-MM-DD")
        // plusInfo.expireTime= dayjs("2025-06-10").valueOf()
        let expiresDays =Math.floor((plusInfo.expireTime - new Date().getTime())/ 1000 / 60 / 60 / 24)
        let title = ""
        let content =""
        if(expiresDays === 20 ||expiresDays === 10 || expiresDays === 3 || expiresDays === 1 || expiresDays === 0){
          title = `vip(${label})即将到期`
          content = `您的${appTitle} vip (${label})剩余${expiresDays}天(${expiresDate})到期，请及时续期，以免影响业务`
        }else if (expiresDays === -1 || expiresDays === -3 || expiresDays === -7) {
          title = `vip(${label})已过期`
          content = `您的${appTitle} vip (${label})已过期${Math.abs(expiresDays)}天(${expiresDate})，请尽快续期，以免影响业务`
        }
        if(title){
          logger.warn(title)
          logger.warn(content)
          const url = await this.notificationService.getBindUrl("");
          const adminUsers = await this.userService.getAdmins()
          for (const adminUser of adminUsers) {
            logger.info(`发送vip到期通知给管理员：${adminUser.username}`)
            await this.notificationService.send({
              useDefault: true,
              logger: logger,
              body:{
                title,
                content,
                errorMessage:title,
                url,
                notificationType: "vipExpireRemind",
              }
            },adminUser.id)
          }

        }

      }
    })
  }


  registerUserExpireCheckCron() {
    // 添加plus即将到期检查任务
    this.cron.register({
      name: 'user-expire-check',
      cron: `0 20 9 * * *`, // 一天只能检查一次，否则会重复发送通知
      job: async () => {

        const getExpiresDaysUsers = async (days: number) => {
          const targetDate = dayjs().add(days, 'day')
          const startTime = targetDate.startOf('day').valueOf()
          const endTime = targetDate.endOf('day').valueOf()
          return await this.userService.find({
            where: {
              validTime: Between(startTime, endTime),
              status: 1
            }
          })
        }

        const notifyExpiresDaysUsers = async (days: number) => {
          const list = await getExpiresDaysUsers(days)
          if (list.length === 0) {
            return
          }
          let title = `账号即将到期`
          let content = `您的账号剩余${days}天到期，请及时续期，以免影响业务`
          if (days <= 0) {
            title = `账号已过期`
            content = `您的账号已过期${Math.abs(days)}天，请尽快续期，以免影响业务`
          }
          const url = await this.notificationService.getBindUrl("");
          for (const user of list) {
            logger.info(`发送到期通知给用户：${user.username}`)
            await this.notificationService.send({
              useDefault: true,
              logger: logger,
              body: {
                title,
                content,
                errorMessage: title,
                url,
                notificationType: "userExpireRemind",
              }
            }, user.id)
          }
        }

        await notifyExpiresDaysUsers(7)
        await notifyExpiresDaysUsers(3)
        await notifyExpiresDaysUsers(1)
        await notifyExpiresDaysUsers(0)
        await notifyExpiresDaysUsers(-1)
        await notifyExpiresDaysUsers(-3)
      }
    })
  }


  registerDomainExpireCheckCron(){
    if (!isPlus()){
      return
    }
    // 添加域名即将到期检查任务
    const randomWeek = Math.floor(Math.random() * 7) + 1
    const randomHour = Math.floor(Math.random() * 24)
    const randomMinute = Math.floor(Math.random() * 60)
    logger.info(`注册域名注册过期时间检查任务，每周${randomWeek} ${randomHour}:${randomMinute}检查一次`)
    this.cron.register({
      name: 'domain-expire-check',
      cron: `0 ${randomMinute} ${randomHour} ? * ${randomWeek}`, // 每周随机一天检查一次
      job: async () => {
        await this.domainService.startSyncExpirationTask({})
      }
    })
  }
}
