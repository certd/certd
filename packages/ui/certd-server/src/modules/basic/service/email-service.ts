import { Inject, Provide, Scope, ScopeEnum } from '@midwayjs/decorator';
import type { EmailSend } from '@certd/pipeline';
import { IEmailService } from '@certd/pipeline';
import nodemailer from 'nodemailer';
import type SMTPConnection from 'nodemailer/lib/smtp-connection';
import { logger } from '../../../utils/logger';
import { UserSettingsService } from '../../mine/service/user-settings-service';

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
} & SMTPConnection.Options;
@Provide()
@Scope(ScopeEnum.Singleton)
export class EmailService implements IEmailService {
  @Inject()
  settingsService: UserSettingsService;

  /**
   */
  async send(email: EmailSend) {
    console.log('sendEmail', email);

    const emailConfigEntity = await this.settingsService.getByKey(
      'email',
      email.userId
    );
    if (emailConfigEntity == null || !emailConfigEntity.setting) {
      throw new Error('email settings 未设置');
    }
    const emailConfig = JSON.parse(emailConfigEntity.setting) as EmailConfig;
    const transporter = nodemailer.createTransport(emailConfig);
    const mailOptions = {
      from: emailConfig.sender,
      to: email.receivers.join(', '), // list of receivers
      subject: email.subject,
      text: email.content,
    };
    await transporter.sendMail(mailOptions);
    logger.info('sendEmail complete: ', email);
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
