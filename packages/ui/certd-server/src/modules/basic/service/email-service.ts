import { Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import type { EmailSend } from '@certd/pipeline';
import { IEmailService, isPlus } from '@certd/pipeline';
import nodemailer from 'nodemailer';
import type SMTPConnection from 'nodemailer/lib/smtp-connection';
import { logger } from '../../../utils/logger.js';
import { UserSettingsService } from '../../mine/service/user-settings-service.js';
import { PlusService } from './plus-service.js';

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
    console.log('sendEmail', email);

    const emailConfigEntity = await this.settingsService.getByKey('email', email.userId);
    if (emailConfigEntity == null || !emailConfigEntity.setting) {
      if (isPlus()) {
        //自动使用plus发邮件
        return await this.sendByPlus(email);
      }
      throw new Error('email settings 未设置');
    }
    const emailConfig = JSON.parse(emailConfigEntity.setting) as EmailConfig;
    if (emailConfig.usePlus && isPlus()) {
      return await this.sendByPlus(email);
    }
    await this.sendByCustom(emailConfig, email);
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
