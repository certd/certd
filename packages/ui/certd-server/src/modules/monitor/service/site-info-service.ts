import {Inject, Provide, Scope, ScopeEnum} from "@midwayjs/core";
import {BaseService, NeedSuiteException, NeedVIPException, SysSettingsService} from "@certd/lib-server";
import {InjectEntityModel} from "@midwayjs/typeorm";
import {Repository} from "typeorm";
import {SiteInfoEntity} from "../entity/site-info.js";
import {siteTester} from "./site-tester.js";
import dayjs from "dayjs";
import {logger, utils} from "@certd/basic";
import {PeerCertificate} from "tls";
import {NotificationService} from "../../pipeline/service/notification-service.js";
import {isComm, isPlus} from "@certd/plus-core";
import {UserSuiteService} from "@certd/commercial-core";
import {UserSettingsService} from "../../mine/service/user-settings-service.js";
import {UserSiteMonitorSetting} from "../../mine/service/models.js";
import {SiteIpService} from "./site-ip-service.js";
import {SiteIpEntity} from "../entity/site-ip.js";
import {Cron} from "../../cron/cron.js";
import { dnsContainer } from "./dns-custom.js";

@Provide()
@Scope(ScopeEnum.Request, {allowDowngrade: true})
export class SiteInfoService extends BaseService<SiteInfoEntity> {
  @InjectEntityModel(SiteInfoEntity)
  repository: Repository<SiteInfoEntity>;

  @Inject()
  notificationService: NotificationService;

  @Inject()
  sysSettingsService: SysSettingsService;

  @Inject()
  userSuiteService: UserSuiteService;

  @Inject()
  userSettingsService: UserSettingsService;

  @Inject()
  siteIpService: SiteIpService;


  @Inject()
  cron: Cron;

  //@ts-ignore
  getRepository() {
    return this.repository;
  }

  async add(data: SiteInfoEntity) {
    if (!data.userId) {
      throw new Error("userId is required");
    }

    if (isComm()) {
      const suiteSetting = await this.userSuiteService.getSuiteSetting();
      if (suiteSetting.enabled) {
        const userSuite = await this.userSuiteService.getMySuiteDetail(data.userId);
        if (userSuite.monitorCount.max != -1 && userSuite.monitorCount.max <= userSuite.monitorCount.used) {
          throw new NeedSuiteException("站点监控数量已达上限，请购买或升级套餐");
        }
      }
    } else if (!isPlus()) {
      const count = await this.getUserMonitorCount(data.userId);
      if (count >= 1) {
        throw new NeedVIPException("站点监控数量已达上限，请升级专业版");
      }
    }
    data.disabled = false;

    const found = await this.repository.findOne({
      where: {
        domain: data.domain,
        userId: data.userId,
        httpsPort: data.httpsPort || 443
      }
    });
    if (found) {
      return {id: found.id};
    }

    return await super.add(data);
  }

  async update(data: any) {
    if (!data.id) {
      throw new Error("id is required");
    }
    delete data.userId;
    await super.update(data);
  }

  async getUserMonitorCount(userId: number) {
    if (!userId) {
      throw new Error("userId is required");
    }
    return await this.repository.count({
      where: {userId}
    });
  }

  /**
   * 检查站点证书过期时间
   * @param site
   * @param notify
   * @param retryTimes
   */
  async doCheck(site: SiteInfoEntity, notify = true, retryTimes = null) {
    if (!site?.domain) {
      throw new Error("站点域名不能为空");
    }

    const setting = await this.userSettingsService.getSetting<UserSiteMonitorSetting>(site.userId, UserSiteMonitorSetting);
    const dnsServer = setting.dnsServer
    let customDns = null
    if (dnsServer && dnsServer.length > 0) {
      customDns = dnsContainer.getDns(dnsServer) as any
    }

    try {
      await this.update({
        id: site.id,
        checkStatus: "checking",
        lastCheckTime: dayjs().valueOf()
      });
      const res = await siteTester.test({
        host: site.domain,
        port: site.httpsPort,
        retryTimes,
        customDns
      });

      const certi: PeerCertificate = res.certificate;
      if (!certi) {
        throw new Error("没有发现证书");
      }
      const effective = certi.valid_from;
      const expires = certi.valid_to;
      const allDomains = certi.subjectaltname?.replaceAll("DNS:", "").split(",") || [];
      const mainDomain = certi.subject?.CN;
      let domains = allDomains;
      if (!allDomains.includes(mainDomain)) {
        domains = [mainDomain, ...allDomains];
      }
      const issuer = `${certi.issuer.O}<${certi.issuer.CN}>`;
      const isExpired = dayjs().valueOf() > dayjs(expires).valueOf();
      const status = isExpired ? "expired" : "ok";
      const updateData = {
        id: site.id,
        certDomains: domains.join(","),
        certStatus: status,
        certProvider: issuer,
        certEffectiveTime: dayjs(effective).valueOf(),
        certExpiresTime: dayjs(expires).valueOf(),
        lastCheckTime: dayjs().valueOf(),
        error: null,
        checkStatus: "ok"
      };
      logger.info(`测试站点成功：id=${updateData.id},site=${site.name},certEffectiveTime=${updateData.certEffectiveTime},expiresTime=${updateData.certExpiresTime}`)
      if (site.ipCheck) {
        delete updateData.checkStatus
      }
      await this.update(updateData);


      //检查ip
      await this.checkAllIp(site,retryTimes);

      if (!notify) {
        return;
      }
      try {
        await this.sendExpiresNotify(site);
      } catch (e) {
        logger.error("send notify error", e);
      }
    } catch (e) {
      logger.error("check site error", e);
      await this.update({
        id: site.id,
        checkStatus: "error",
        lastCheckTime: dayjs().valueOf(),
        error: e.message
      });
      if (!notify) {
        return;
      }
      try {
        await this.sendCheckErrorNotify(site);
      } catch (e) {
        logger.error("send notify error", e);
      }
    }
  }

  async checkAllIp(site: SiteInfoEntity,retryTimes = null) {
    if (!site.ipCheck) {
      return;
    }
    const certExpiresTime = site.certExpiresTime;
    const onFinished = async (list: SiteIpEntity[]) => {
      let errorCount = 0;
      let errorMessage = "";
      for (const item of list) {
        if (!item) {
          continue;
        }
        errorCount++;
        if (item.error) {
          errorMessage += `${item.ipAddress}：${item.error}； \n`;
        } else if (item.certExpiresTime !== certExpiresTime) {
          errorMessage += `${item.ipAddress}：与主站证书过期时间不一致； \n`;
        } else {
          errorCount--;
        }
      }
      if (errorCount <= 0) {
        //检查正常
        await this.update({
          id: site.id,
          checkStatus: "ok",
          error: "",
          ipErrorCount: 0
        });
        return;
      }
      await this.update({
        id: site.id,
        checkStatus: "error",
        error: errorMessage,
        ipErrorCount: errorCount
      });
      try {
        site = await this.info(site.id);
        await this.sendCheckErrorNotify(site, true);
      } catch (e) {
        logger.error("send notify error", e);
      }
    };
    await this.siteIpService.syncAndCheck(site, retryTimes,onFinished);
  }

  /**
   * 检查
   * @param id
   * @param notify
   * @param retryTimes
   */
  async check(id: number, notify = false, retryTimes = null) {
    const site = await this.info(id);
    if (!site) {
      throw new Error("站点不存在");
    }
    return await this.doCheck(site, notify, retryTimes);
  }

  async sendCheckErrorNotify(site: SiteInfoEntity, fromIpCheck = false) {
    const url = await this.notificationService.getBindUrl("#/certd/monitor/site");
    const setting = await this.userSettingsService.getSetting<UserSiteMonitorSetting>(site.userId, UserSiteMonitorSetting)
    // 发邮件
    await this.notificationService.send(
      {
        id: setting?.notificationId,
        useDefault: true,
        logger: logger,
        body: {
          url,
          title: `站点证书${fromIpCheck ? "(IP)" : ""}检查出错<${site.name}>`,
          content: `站点名称： ${site.name} \n站点域名： ${site.domain} \n错误信息：${site.error}`,
          errorMessage: site.error
        }
      },
      site.userId
    );
  }

  async sendExpiresNotify(site: SiteInfoEntity) {

    const tipDays = 10;

    const expires = site.certExpiresTime;
    const validDays = dayjs(expires).diff(dayjs(), "day");
    const url = await this.notificationService.getBindUrl("#/certd/monitor/site");
    const setting = await this.userSettingsService.getSetting<UserSiteMonitorSetting>(site.userId, UserSiteMonitorSetting)
    const content = `站点名称： ${site.name} \n站点域名： ${site.domain} \n证书域名： ${site.certDomains} \n颁发机构： ${site.certProvider} \n过期时间： ${dayjs(site.certExpiresTime).format("YYYY-MM-DD")} \n`;
    if (validDays >= 0 && validDays < tipDays) {
      // 发通知
      await this.notificationService.send(
        {
          id: setting?.notificationId,
          useDefault: true,
          logger: logger,
          body: {
            title: `站点证书即将过期，剩余${validDays}天，<${site.name}>`,
            content,
            url,
            errorMessage: "站点证书即将过期"
          }
        },
        site.userId
      );
    } else if (validDays < 0) {
      //发过期通知
      await this.notificationService.send(
        {
          id: setting?.notificationId,
          useDefault: true,
          logger: logger,
          body: {
            title: `站点证书已过期${-validDays}天<${site.name}>`,
            content,
            url,
            errorMessage: "站点证书已过期"
          }
        },
        site.userId
      );
    }
  }

  async checkAllByUsers(userId: any) {
    if (!userId) {
      throw new Error("userId is required");
    }
    const sites = await this.repository.find({
      where: {userId}
    });
    this.checkList(sites,false);
  }

  async checkList(sites: SiteInfoEntity[],isCommon: boolean) {
    const cache = {}
    const getFromCache = async (userId: number) =>{
      if (cache[userId]) {
        return cache[userId];
      }
      const setting =  await this.userSettingsService.getSetting<UserSiteMonitorSetting>(userId, UserSiteMonitorSetting)
      cache[userId] = setting
      return setting;
    }
    for (const site of sites) {
      const setting = await getFromCache(site.userId)
      if (isCommon) {
        //公共的检查，排除有设置cron的用户
        if  (setting?.cron) {
          //设置了cron，跳过公共检查
          continue;
        }
      }
      let retryTimes = setting?.retryTimes
      this.doCheck(site,true,retryTimes).catch(e => {
        logger.error(`检查站点证书失败，${site.domain}`, e.message);
      });
      await utils.sleep(100);
    }
  }

  async getSetting(userId: number) {
    return await this.userSettingsService.getSetting<UserSiteMonitorSetting>(userId, UserSiteMonitorSetting);
  }

  async saveSetting(userId: number, bean: UserSiteMonitorSetting) {
    await this.userSettingsService.saveSetting(userId, bean);
    if(bean.cron){
      //注册job
      await this.registerSiteMonitorJob(userId);
    }else{
      this.clearSiteMonitorJob(userId);
    }
  }

  async ipCheckChange(req: { id: any; ipCheck: any }) {

    await this.update({
      id: req.id,
      ipCheck: req.ipCheck
    });
    if (req.ipCheck) {
      const site = await this.info(req.id);
      await this.siteIpService.sync(site);
    }
  }

  async disabledChange(req: { disabled: any; id: any }) {
    await this.update({
      id: req.id,
      disabled: req.disabled
    });
    if (!req.disabled) {
      const site = await this.info(req.id);
      await this.doCheck(site);
    }
  }

  async doImport(req: { text: string; userId: number }) {
    if (!req.text) {
      throw new Error("text is required");
    }
    if (!req.userId) {
      throw new Error("userId is required");
    }

    const rows = req.text.split("\n");

    const list = [];
    for (const item of rows) {
      if (!item) {
        continue;
      }
      const arr = item.trim().split(":");
      if (arr.length === 0) {
        continue;
      }
      const domain = arr[0];
      let port = 443;
      let name = domain;
      if (arr.length > 1) {
        try {
          port = parseInt(arr[1] || "443");
        } catch (e) {
          throw new Error(`${item}格式错误`);
        }

      }
      if (arr.length > 2) {
        name = arr[2] || domain;
      }

      list.push({
        domain,
        name,
        httpsPort: port,
        userId: req.userId
      });
    }

    const batchAdd = async (list: any[]) => {
      for (const item of list) {
        await this.add(item);
      }

      // await this.checkAllByUsers(req.userId);
    };
    await batchAdd(list);
  }

  clearSiteMonitorJob(userId: number) {
    this.cron.remove(`siteMonitor-${userId}`);
  }

  async registerSiteMonitorJob(userId?: number) {

    if(!userId){
      //注册公共job
      logger.info(`注册站点证书检查定时任务`)
      this.cron.register({
        name: 'siteMonitor',
        cron: '0 0 0 * * *',
        job:async ()=>{
          await this.triggerJobOnce()
        },
      });
      logger.info(`注册站点证书检查定时任务完成`)
    }else{
      const setting = await this.userSettingsService.getSetting<UserSiteMonitorSetting>(userId, UserSiteMonitorSetting);
      if (!setting.cron) {
        return;
      }
      //注册个人的
      this.cron.register({
        name: `siteMonitor-${userId}`,
        cron: setting.cron,
        job: () => this.triggerJobOnce(userId),
      });
    }

  }

  async triggerJobOnce(userId?:number) {
    logger.info(`站点证书检查开始执行[${userId??'所有用户'}]`);
    const query:any = { disabled: false };
    if(userId){
      query.userId = userId;
      //判断是否已关闭
      const setting = await this.userSettingsService.getSetting<UserSiteMonitorSetting>(userId, UserSiteMonitorSetting);
      if (!setting.cron) {
        return;
      }
    }
    let offset = 0;
    const limit = 50;
    while (true) {
      const res = await this.page({
        query: query,
        page: { offset, limit },
      });
      const { records } = res;

      if (records.length === 0) {
        break;
      }
      offset += records.length;
      const isCommon = !userId;
      await this.checkList(records,isCommon);
    }

    logger.info(`站点证书检查完成[${userId??'所有用户'}]`);
  }
}
