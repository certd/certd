import { TencentAccess } from '../../../plugins/plugin-lib/tencent/access.js';
import {ISmsService, PluginInputs, SmsPluginCtx} from './api.js';

export type TencentSmsConfig = {
  accessId: string;
  signName: string;
  codeTemplateId: string;
  appId: string;
  region: string;
};

export class TencentSmsService implements ISmsService {
  static getDefine() {
    return {
      name: 'tencent',
      desc: '腾讯云短信服务',
      input: {
        accessId: {
          title: '腾讯云授权',
          component: {
            name: 'access-selector',
            type: 'tencent',
          },
          required: true,
        },
        region: {
          title: '区域',
          value:"ap-beijing",
          component: {
            name: 'a-select',
            vModel: 'value',
            options:[
              {value:"ap-beijing",label:"华北地区（北京）"},
              {value:"ap-guangzhou",label:"华南地区（广州）"},
              {value:"ap-nanjing",label:"华东地区（南京）"},
            ]
          },
          helper:"随便选一个",
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
        appId: {
          title: '应用ID',
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
      } as PluginInputs<TencentSmsConfig>,
    };
  }

  ctx: SmsPluginCtx<TencentSmsConfig>;

  setCtx(ctx: any) {
    this.ctx = ctx;
  }


  async getClient() {
    const sdk = await import('tencentcloud-sdk-nodejs/tencentcloud/services/sms/v20210111/index.js');
    const client = sdk.v20210111.Client;
    const access = await this.ctx.accessService.getById<TencentAccess>(this.ctx.config.accessId);


    // const region = this.region;
    const clientConfig = {
      credential: {
        secretId: access.secretId,
        secretKey: access.secretKey,
      },
      region: this.ctx.config.region,
      profile: {
        httpProfile: {
          endpoint: `sms.${access.intlDomain()}tencentcloudapi.com`,
        },
      },
    };

    return new client(clientConfig);
  }

  async sendSmsCode(opts: { mobile: string; code: string; phoneCode: string }) {
    const { mobile, code, phoneCode } = opts;

    const client = await this.getClient();
    const smsConfig = this.ctx.config;
    const params = {
      "PhoneNumberSet": [
        `+${phoneCode}${mobile}`
      ],
      "SmsSdkAppId": smsConfig.appId,
      "TemplateId": smsConfig.codeTemplateId,
      "SignName": smsConfig.signName,
      "TemplateParamSet": [
        code
      ]
    };
    const ret = await client.SendSms(params);
    this.checkRet(ret);
  }

  checkRet(ret: any) {
    if (!ret || ret.Error) {
      throw new Error('执行失败：' + ret.Error.Code + ',' + ret.Error.Message);
    }
  }
}
