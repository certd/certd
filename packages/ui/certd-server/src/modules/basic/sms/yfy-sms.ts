import { http, utils } from '@certd/basic';
import { ISmsService, PluginInputs, SmsPluginCtx } from './api.js';
import { YfySmsAccess } from '../../../plugins/plugin-plus/yidun/access-sms.js';

export type YfySmsConfig = {
  accessId: string;
  signName: string;
};

export class YfySmsService implements ISmsService {
  static getDefine() {
    return {
      name: 'yfysms',
      desc: '易发云短信',
      input: {
        accessId: {
          title: '易发云短信授权',
          component: {
            name: 'access-selector',
            type: 'yfysms',
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
      } as PluginInputs<YfySmsConfig>,
    };
  }

  ctx: SmsPluginCtx<YfySmsConfig>;

  setCtx(ctx: any) {
    this.ctx = ctx;
  }

  async sendSmsCode(opts: { mobile: string; code: string; phoneCode: string }) {
    const { mobile, code } = opts;
    const access = await this.ctx.accessService.getById<YfySmsAccess>(this.ctx.config.accessId);

    const res = await http.request({
      url: 'http://sms.yfyidc.cn/sms/',
      method: 'post',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: {
        /**
         * u	是	KeyID
         * p	是	KeySecret，需要md5
         * m	是	发送手机号码
         * c
         */
        u: access.keyId,
        p: utils.hash.md5(access.keySecret),
        m: mobile,
        c: `【${this.ctx.config.signName}】您的验证码是${code}。如非本人操作，请忽略本短信`,
      },
    });
    if (res !== 0) {
      /**
       * 1	余额不足
       * 2	用户不存在
       * 3	KEY错误
       * 4	发送失败
       * 5	签名不存在
       * 6	签名审核未通过
       * 7	当前发信短信已达到上限
       * 8	有违规词
       * 9	用户已封禁
       * 10	未实名认证
       */
      let message = '';
      switch (res) {
        case 1:
          message = '余额不足';
          break;
        case 2:
          message = '用户不存在';
          break;
        case 3:
          message = 'KEY错误';
          break;
        case 4:
          message = '发送失败';
          break;
        case 5:
          message = '签名不存在';
          break;
        case 6:
          message = '签名审核未通过';
          break;
        case 7:
          message = '当前发信短信已达到上限';
          break;
        case 8:
          message = '有违规词';
          break;
        case 9:
          message = '用户已封禁';
          break;
        case 10:
          message = '未实名认证';
          break;
        default:
          message = '未知错误';
      }
      throw new Error(`发送短信失败:${message}`);
    }
  }
}
