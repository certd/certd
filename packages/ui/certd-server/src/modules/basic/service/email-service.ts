import { Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import type { EmailSend } from '@certd/pipeline';
import { IEmailService, isPlus, logger } from '@certd/pipeline';
import nodemailer from 'nodemailer';
import type SMTPConnection from 'nodemailer/lib/smtp-connection';
import { UserSettingsService } from '../../mine/service/user-settings-service.js';
import { PlusService, SysSettingsService } from '@certd/lib-server';
import { getEmailSettings } from '../../sys/settings/fix.js';

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
} & SMTPConnection.Options;
@Provide()
@Scope(ScopeEnum.Singleton)
export class EmailService implements IEmailService {
  @Inject()
  settingsService: UserSettingsService;

  @Inject()
  sysSettingsService: SysSettingsService;
  @Inject()
  plusService: PlusService;

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

    await this.plusService.request({
      url: '/activation/emailSend',
      data: {
        subject: email.subject,
        text: email.content,
        to: email.receivers,
      },
    });
  }

  /**
   */
  async send(email: EmailSend) {
    logger.info('sendEmail', email);

    const emailConf = await getEmailSettings(this.sysSettingsService, this.settingsService);

    if (!emailConf.host && emailConf.usePlus == null) {
      if (isPlus()) {
        //自动使用plus发邮件
        return await this.sendByPlus(email);
      }
      throw new Error('email settings 还未设置');
    }

    if (emailConf.usePlus && isPlus()) {
      return await this.sendByPlus(email);
    }
    await this.sendByCustom(emailConf, email);
    logger.info('sendEmail complete: ', email);
  }

  private async sendByCustom(emailConfig: EmailConfig, email: EmailSend) {
    const transporter = nodemailer.createTransport(emailConfig);
    const mailOptions = {
      from: emailConfig.sender,
      to: email.receivers.join(', '), // list of receivers
      subject: email.subject,
      text: email.content,
    };
    await transporter.sendMail(mailOptions);
  }

  async test(userId: number, receiver: string) {
    await this.send({
      userId,
      receivers: [receiver],
      subject: '测试邮件,from certd',
      content: '测试邮件,from certd',
    });
  }
}
