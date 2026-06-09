import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { BaseService, Constants, isEnterprise, NeedSuiteException, NeedVIPException, SysSettingsService } from "@certd/lib-server";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { In, Repository } from "typeorm";
import { SiteInfoEntity } from "../entity/site-info.js";
import { siteTester } from "./site-tester.js";
import dayjs from "dayjs";
import { logger, utils } from "@certd/basic";
import { PeerCertificate } from "tls";
import { NotificationService } from "../../pipeline/service/notification-service.js";
import { isComm, isPlus } from "@certd/plus-core";
import { UserSuiteService } from "@certd/commercial-core";
import { UserSettingsService } from "../../mine/service/user-settings-service.js";
import { UserSiteMonitorSetting } from "../../mine/service/models.js";
import { SiteIpService } from "./site-ip-service.js";
import { SiteIpEntity } from "../entity/site-ip.js";
import { Cron } from "../../cron/cron.js";
import { dnsContainer } from "./dns-custom.js";
import { merge } from "lodash-es";
import { JobHistoryService } from "./job-history-service.js";
import { JobHistoryEntity } from "../entity/job-history.js";
import { UserService } from "../../sys/authority/service/user-service.js";
import { ProjectService } from "../../sys/enterprise/service/project-service.js";

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
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
  jobHistoryService: JobHistoryService;

  @Inject()
  userService: UserService;
  @Inject()
  projectService: ProjectService;

  @Inject()
  cron: Cron;

  //@ts-ignore
  getRepository() {
    return this.repository;
  }

  async checkMonitorLimit(userId: number) {
    if (isEnterprise()) {
      //企业模式不限制
      return;
    }

    if (isComm()) {
      const suiteSetting = await this.userSuiteService.getSuiteSetting();
      if (suiteSetting.enabled) {
        const userSuite = await this.userSuiteService.getMySuiteDetail(userId);
        if (userSuite.monitorCount.max != -1 && userSuite.monitorCount.max <= userSuite.monitorCount.used) {
          throw new NeedSuiteException("站点监控数量已达上限，请购买或升级套餐");
        }
      }
    } else if (!isPlus()) {
      const count = await this.getUserMonitorCount(userId);
      if (count >= 1) {
        throw new NeedVIPException("站点监控数量已达上限，请升级专业版");
      }
    }
  }

  async add(data: SiteInfoEntity) {
    if (data.userId == null) {
      throw new Error("userId is required");
    }

    await this.checkMonitorLimit(data.userId);

    data.disabled = false;

    const found = await this.repository.findOne({
      where: {
        domain: data.domain,
        userId: data.userId,
        httpsPort: data.httpsPort || 443,
      },
    });
    if (found) {
      return { id: found.id };
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
    if (userId == null) {
      throw new Error("userId is required");
    }
    return await this.repository.count({
      where: { userId },
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

    const setting = await this.userSettingsService.getSetting<UserSiteMonitorSetting>(site.userId, site.projectId, UserSiteMonitorSetting);
    const dnsServer = setting.dnsServer;
    let customDns = null;
    if (dnsServer && dnsServer.length > 0) {
      customDns = dnsContainer.getDns(dnsServer) as any;
    }

    try {
      await this.update({
        id: site.id,
        checkStatus: "checking",
        lastCheckTime: dayjs().valueOf(),
      });
      const res = await siteTester.test({
        host: site.domain,
        port: site.httpsPort,
        retryTimes,
        customDns,
        ipAddress: site.ipAddress,
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
        checkStatus: "ok",
      };
      logger.info(`测试站点成功：id=${updateData.id},site=${site.name},certEffectiveTime=${updateData.certEffectiveTime},expiresTime=${updateData.certExpiresTime}`);
      if (site.ipCheck) {
        delete updateData.checkStatus;
      }
      await this.update(updateData);

      const setting = await this.userSettingsService.getSetting<UserSiteMonitorSetting>(site.userId, site.projectId, UserSiteMonitorSetting);

      merge(site, updateData);
      //检查ip
      await this.checkAllIp(site, retryTimes, setting);

      if (!notify) {
        return;
      }

      try {
        await this.sendExpiresNotify(site.id, setting);
      } catch (e) {
        logger.error("send notify error", e);
      }
    } catch (e) {
      logger.error("check site error", e);
      let message = e.message;
      if (!message) {
        message = e.code;
      }
      if (e.errors && e.errors.length > 0) {
        message += "\n" + e.errors.map((item: any) => item.message).join("\n");
      }
      await this.update({
        id: site.id,
        checkStatus: "error",
        lastCheckTime: dayjs().valueOf(),
        error: message,
      });
      if (!notify) {
        return;
      }
      try {
        await this.sendCheckErrorNotify(site.id, false, setting);
      } catch (e) {
        logger.error("send notify error", e);
      }
    }
  }

  async checkAllIp(site: SiteInfoEntity, retryTimes = null, setting: UserSiteMonitorSetting) {
    if (!site.ipCheck) {
      return;
    }
    const certExpiresTime = site.certExpiresTime;
    const tipDays = setting?.certValidDays || 10;
    const onFinished = async (list: SiteIpEntity[]) => {
      let errorCount = 0;
      let errorMessage = "";
      for (const item of list) {
        if (!item) {
          continue;
        }
        errorCount++;

        const isExpired = dayjs().valueOf() > dayjs(item.certExpiresTime).valueOf();
        const isWillExpired = dayjs().valueOf() > dayjs(item.certExpiresTime).subtract(tipDays, "day").valueOf();

        if (item.error) {
          errorMessage += `${item.ipAddress}：${item.error}； \n`;
        } else if (item.certExpiresTime !== certExpiresTime && !site.ipIgnoreCoherence) {
          errorMessage += `${item.ipAddress}：与主站证书过期时间不一致(主站：${dayjs(certExpiresTime).format("YYYY-MM-DD")}，IP：${dayjs(item.certExpiresTime).format("YYYY-MM-DD")})； \n`;
        } else if (isExpired) {
          errorMessage += `${item.ipAddress}：证书已过期(过期时间：${dayjs(item.certExpiresTime).format("YYYY-MM-DD")})； \n`;
        } else if (isWillExpired) {
          errorMessage += `${item.ipAddress}：证书将过期(过期时间：${dayjs(item.certExpiresTime).format("YYYY-MM-DD")})； \n`;
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
          ipErrorCount: 0,
        });
        return;
      }
      await this.update({
        id: site.id,
        checkStatus: "error",
        error: errorMessage,
        ipErrorCount: errorCount,
      });
      try {
        await this.sendCheckErrorNotify(site.id, true, setting);
      } catch (e) {
        logger.error("send notify error", e);
      }
    };
    if (site.ipSyncAuto === false) {
      await this.siteIpService.checkAll(site, retryTimes, onFinished);
    } else {
      await this.siteIpService.syncAndCheck(site, retryTimes, onFinished);
    }
  }

  /**
   * 检查,不等待返回
   * @param id
   * @param notify
   * @param retryTimes
   */
  async check(id: number, notify = false, retryTimes = null) {
    const site = await this.info(id);
    if (!site) {
      throw new Error("站点不存在");
    }

    this.doCheck(site, notify, retryTimes).catch(err => {
      logger.error("check site error", err);
    });
    return;
  }

  async sendCheckErrorNotify(siteId: number, fromIpCheck = false, setting: UserSiteMonitorSetting) {
    const site = await this.info(siteId);
    const url = await this.notificationService.getBindUrl("#/certd/monitor/site");
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
          errorMessage: site.error,
          notificationType: "siteCheckError",
        },
      },
      site.userId
    );
  }

  async sendExpiresNotify(siteId: number, setting: UserSiteMonitorSetting) {
    const tipDays = setting?.certValidDays || 10;
    const site = await this.info(siteId);
    const expires = site.certExpiresTime;
    const validDays = dayjs(expires).diff(dayjs(), "day");
    const url = await this.notificationService.getBindUrl("#/certd/monitor/site");
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
            errorMessage: "站点证书即将过期",
            notificationType: "siteCertExpireRemind",
          },
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
            errorMessage: "站点证书已过期",
            notificationType: "siteCertExpireRemind",
          },
        },
        site.userId
      );
    }
  }

  async checkList(sites: SiteInfoEntity[]) {
    const cache = {};
    const getFromCache = async (userId: number, projectId?: number) => {
      const key = `${userId}_${projectId ?? ""}`;
      if (cache[key]) {
        return cache[key];
      }
      const setting = await this.userSettingsService.getSetting<UserSiteMonitorSetting>(userId, projectId, UserSiteMonitorSetting);
      cache[key] = setting;
      return setting;
    };
    for (const site of sites) {
      const setting = await getFromCache(site.userId, site.projectId);
      const retryTimes = setting?.retryTimes;
      this.doCheck(site, true, retryTimes).catch(e => {
        logger.error(`检查站点证书失败，${site.domain}`, e.message);
      });
      await utils.sleep(100);
    }
  }

  async getSetting(userId: number, projectId?: number) {
    return await this.userSettingsService.getSetting<UserSiteMonitorSetting>(userId, projectId, UserSiteMonitorSetting);
  }

  async saveSetting(userId: number, projectId: number, bean: UserSiteMonitorSetting) {
    await this.userSettingsService.saveSetting(userId, projectId, bean);
    if (bean.cron) {
      //注册job
      await this.registerSiteMonitorJob(userId, projectId);
    } else {
      this.clearSiteMonitorJob(userId, projectId);
    }
  }

  async ipCheckChange(req: { id: any; ipCheck: any }) {
    await this.update({
      id: req.id,
      ipCheck: req.ipCheck,
    });
    if (req.ipCheck) {
      const site = await this.info(req.id);
      await this.siteIpService.sync(site);
    }
  }

  async disabledChange(req: { disabled: any; id: any }) {
    await this.update({
      id: req.id,
      disabled: req.disabled,
    });
    if (!req.disabled) {
      const site = await this.info(req.id);
      await this.doCheck(site);
    }
  }

  async doImport(req: { text: string; userId: number; groupId?: number; projectId?: number }) {
    if (!req.text) {
      throw new Error("text is required");
    }
    if (req.userId == null) {
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
      let remark = "";
      if (arr.length > 3) {
        remark = arr[3] || "";
      }

      list.push({
        domain,
        name,
        httpsPort: port,
        userId: req.userId,
        remark,
        groupId: req.groupId,
        projectId: req.projectId,
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

  clearSiteMonitorJob(userId: number, projectId?: number) {
    this.cron.remove(`siteMonitor_${userId}_${projectId || ""}`);
  }

  async registerSiteMonitorJob(userId?: number, projectId?: number) {
    const setting = await this.userSettingsService.getSetting<UserSiteMonitorSetting>(userId, projectId, UserSiteMonitorSetting);
    if (!setting.cron) {
      return;
    }
    //注册个人的 或项目的
    this.cron.register({
      name: `siteMonitor_${userId}_${projectId || ""}`,
      cron: setting.cron,
      job: () => this.triggerJobOnce(userId, projectId),
    });
  }

  async triggerCommonJob() {
    //遍历用户
    const userIds = await this.userService.getAllUserIds();
    for (const userId of userIds) {
      const setting = await this.userSettingsService.getSetting<UserSiteMonitorSetting>(userId, null, UserSiteMonitorSetting);
      if (setting && setting.cron) {
        //该用户有自定义检查时间，跳过公共job
        continue;
      }
      await this.triggerJobOnce(userId);
    }

    //遍历项目
    const projectIds = await this.projectService.getAllProjectIds();
    for (const projectId of projectIds) {
      const userId = Constants.enterpriseUserId;
      const setting = await this.userSettingsService.getSetting<UserSiteMonitorSetting>(userId, projectId, UserSiteMonitorSetting);
      if (setting && setting.cron) {
        //该项目有自定义检查时间，跳过公共job
        continue;
      }
      await this.triggerJobOnce(userId, projectId);
    }
  }

  async triggerJobOnce(userId?: number, projectId?: number) {
    if (userId == null) {
      throw new Error("userId is required");
    }
    const query: any = { disabled: false };
    query.userId = userId;
    if (projectId != null) {
      query.projectId = projectId;
    }
    const siteCount = await this.repository.count({
      where: query,
    });
    if (siteCount === 0) {
      logger.info(`用户/项目[${userId}_${projectId || ""}]没有站点证书需要检查`);
      return;
    }

    logger.info(`站点证书检查开始执行[${userId}_${projectId || ""}]`);

    let jobEntity: Partial<JobHistoryEntity> = null;

    jobEntity = {
      userId,
      projectId,
      type: "siteCertMonitor",
      title: "站点证书检查",
      result: "start",
      startAt: new Date().getTime(),
    };
    await this.jobHistoryService.add(jobEntity);
    let offset = 0;
    const limit = 50;
    let count = 0;
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
      count += records.length;
      await this.checkList(records);
    }

    logger.info(`站点证书检查完成[${userId}_${projectId || ""}]`);
    await this.jobHistoryService.update({
      id: jobEntity.id,
      result: "done",
      content: `共检查${count}个站点`,
      endAt: new Date().getTime(),
      updateTime: new Date(),
    });
  }

  async batchDelete(ids: number[], userId: number, projectId?: number): Promise<void> {
    const userProjectQuery = this.buildUserProjectQuery(userId, projectId);
    await this.repository.delete({
      id: In(ids),
      ...userProjectQuery,
    });
  }
}
