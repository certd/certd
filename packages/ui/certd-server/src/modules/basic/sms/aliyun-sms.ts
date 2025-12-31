import { logger } from '@certd/basic';
import { ISmsService, PluginInputs, SmsPluginCtx } from './api.js';
import { AliyunAccess, AliyunClient } from '../../../plugins/plugin-lib/aliyun/index.js';

export type AliyunSmsConfig = {
  accessId: string;
  signName: string;
  codeTemplateId: string;
};

export class AliyunSmsService implements ISmsService {
  static getDefine() {
    return {
      name: 'aliyun',
      desc: '阿里云短信服务',
      input: {
        accessId: {
          title: '阿里云授权',
          component: {
            name: 'access-selector',
            type: 'aliyun',
          },
          required: true,
        },
        signName: {
          title: '签名',
          component: {
            name: 'a-input',
            vModel: 'value',
          },
          required: true,
        },
        codeTemplateId: {
          title: '验证码模板Id',
          component: {
            name: 'a-input',
            vModel: 'value',
          },
          required: true,
        },
      } as PluginInputs<AliyunSmsConfig>,
    };
  }

  ctx: SmsPluginCtx<AliyunSmsConfig>;

  setCtx(ctx: any) {
    this.ctx = ctx;
  }

  async sendSmsCode(opts: { mobile: string; code: string; phoneCode: string }) {
    const { mobile, code, phoneCode } = opts;
    const access = await this.ctx.accessService.getById<AliyunAccess>(this.ctx.config.accessId);
    const aliyunClinet = new AliyunClient({ logger });
    await aliyunClinet.init({
      accessKeyId: access.accessKeyId,
      accessKeySecret: access.accessKeySecret,
      endpoint: 'https://dysmsapi.aliyuncs.com',
      apiVersion: '2017-05-25',
    });
    const smsConfig = this.ctx.config;
    const phoneNumber = phoneCode + mobile;
    const params = {
      PhoneNumbers: phoneNumber,
      SignName: smsConfig.signName,
      TemplateCode: smsConfig.codeTemplateId,
      TemplateParam: `{"code":"${code}"}`,
    };

    await aliyunClinet.request('SendSms', params);
  }
}
