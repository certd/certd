import { Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import type { EmailSend, EmailSendByTemplateReq } from '@certd/pipeline';
import { IEmailService } from '@certd/pipeline';

import { logger } from '@certd/basic';
import { isComm, isPlus } from '@certd/plus-core';

import nodemailer from 'nodemailer';
import { SendMailOptions } from 'nodemailer';
import { UserSettingsService } from '../../mine/service/user-settings-service.js';
import { AddonService, PlusService, SysEmailConf, SysInstallInfo, SysSettingsService, SysSiteInfo } from '@certd/lib-server';
import { getEmailSettings } from '../../sys/settings/fix.js';
import { UserEmailSetting } from "../../mine/service/models.js";
import { AddonGetterService } from '../../pipeline/service/addon-getter-service.js';
import { EmailContent, ITemplateProvider } from '../../../plugins/plugin-template/api.js';

export type EmailConfig = {
  host: string;
  port: number;
  auth: {
    user: string;
    pass: string;
  };
  secure: boolean; // use TLS
  tls: {
    // do not fail on invalid certs
    rejectUnauthorized: boolean;
  };
  sender: string;
  usePlus?: boolean;
} & SendMailOptions;
@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class EmailService implements IEmailService {
  @Inject()
  settingsService: UserSettingsService;

  @Inject()
  sysSettingsService: SysSettingsService;
  @Inject()
  plusService: PlusService;

  @Inject()
  addonGetterService: AddonGetterService;
  @Inject()
  addonService: AddonService


  async sendByPlus(email: EmailSend) {
    if (!isPlus()) {
      throw new Error('plus not enabled');
    }

    /**
     *  userId: number;
     *   subject: string;
     *   content: string;
     *   receivers: string[];
     */
    await this.plusService.sendEmail(email);
  }

  /**
   */
  async send(email: EmailSend) {
    logger.info('sendEmail', email);

    if (!email.receivers || email.receivers.length === 0) {
      throw new Error('收件人不能为空');
    }

    let sysTitle = 'Certd';
    if (isComm()) {
      const siteInfo = await this.sysSettingsService.getSetting<SysSiteInfo>(SysSiteInfo);
      if (siteInfo) {
        sysTitle = siteInfo.title || sysTitle;
      }
    }
    let subject = email.subject;

    if (!subject) {
      logger.error(new Error('邮件标题不能为空'));
      subject = `邮件标题为空，请联系管理员排查`;
    }


    if (!subject.includes(`【${sysTitle}】`)) {
      subject = `【${sysTitle}】${subject}`;
    }
    email.subject = subject;

    const emailConf = await getEmailSettings(this.sysSettingsService, this.settingsService);

    if (!emailConf.host && emailConf.usePlus == null) {
      if (isPlus()) {
        //自动使用plus发邮件
        return await this.sendByPlus(email);
      }
      throw new Error('邮件服务器还未设置');
    }



    if (emailConf.usePlus && isPlus()) {
      return await this.sendByPlus(email);
    }
    await this.sendByCustom(emailConf, email, sysTitle);
    logger.info('sendEmail complete: ', email);
  }

  private async sendByCustom(emailConfig: EmailConfig, email: EmailSend, sysTitle: string) {
    const transporter = nodemailer.createTransport(emailConfig);
    let from = `${sysTitle} <${emailConfig.sender}>`;
    if (emailConfig.sender.includes('<')) {
      from = emailConfig.sender;
    }
    const mailOptions = {
      from: from,
      to: email.receivers.join(', '), // list of receivers
      subject: email.subject,
      text: email.content,
      html: email.html,
      attachments: email.attachments,
    };
    await transporter.sendMail(mailOptions);
  }

  async test(userId: number, receiver: string) {
    await this.sendByTemplate({
      type: "common",
      data: {
        title: '测试邮件,from certd',
        content: '测试邮件,from certd',
        url: await this.getTestEmailUrl(),
      },
      receivers: [receiver],
    });
  }

  private async getTestEmailUrl() {
    const defaultUrl = "https://certd.docmirror.cn";
    if (!isComm()) {
      return defaultUrl;
    }
    const installInfo = await this.sysSettingsService.getSetting<SysInstallInfo>(SysInstallInfo);
    return installInfo?.bindUrl || installInfo?.bindUrl2 || defaultUrl;
  }

  async list(userId: any) {
    const userEmailSetting = await this.settingsService.getSetting<UserEmailSetting>(userId,null, UserEmailSetting)
    return userEmailSetting.list;
  }

  async delete(userId: any, email: string) {
    const userEmailSetting = await this.settingsService.getSetting<UserEmailSetting>(userId, null, UserEmailSetting)
    userEmailSetting.list = userEmailSetting.list.filter(item => item !== email);
    await this.settingsService.saveSetting(userId, null, userEmailSetting)
  }
  async add(userId: any, email: string) {
    const userEmailSetting = await this.settingsService.getSetting<UserEmailSetting>(userId, null, UserEmailSetting)
    //如果已存在
    if (userEmailSetting.list.includes(email)) {
      return
    }
    userEmailSetting.list.unshift(email)
    await this.settingsService.saveSetting(userId, null, userEmailSetting)
  }

  async sendByTemplate(req: EmailSendByTemplateReq) {
    let content = null
    const emailConf = await this.sysSettingsService.getSetting<SysEmailConf>(SysEmailConf);
    const template = emailConf?.templates?.[req.type]
    if (isPlus() && template &&  template.addonId) {
      const addon: ITemplateProvider<EmailContent> = await this.addonGetterService.getAddonById(template.addonId, true, 0,null)
      if (addon) {
        content = await addon.buildContent({ data: req.data })
      }
    }
    if (isPlus() && !content ) {
      //看看有没有通用模版
      if (emailConf?.templates?.common && emailConf?.templates?.common.addonId) {
        const addon: ITemplateProvider<EmailContent> = await this.addonGetterService.getAddonById(emailConf.templates.common.addonId, true, 0,null)
        if (addon) {
          content = await addon.buildContent({ data: req.data })
        }
      }
    }

    // 没有找到模版，使用默认模版
    if (!content) {
      try {
        const addon: ITemplateProvider<EmailContent> = await this.addonGetterService.getBlank("emailTemplate", req.type)
        content = await addon.buildDefaultContent({ data: req.data })
      } catch (e) {
        // 对应的通知类型模版可能没有注册或者开发
      }
    }

    if (!content) {
      const addon: ITemplateProvider<EmailContent> = await this.addonGetterService.getBlank("emailTemplate", "common")
      content = await addon.buildDefaultContent({ data: req.data })
    }
    return await this.send({
      ...content,
      receivers: req.receivers,
      attachments: req.attachments,
    })
  }
}
