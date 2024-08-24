import { Config, Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { SysSettingsService } from '../../system/service/sys-settings-service.js';
import { SysInstallInfo } from '../../system/service/models.js';
import { AppKey, getPlusInfo, isPlus } from '@certd/pipeline';
import * as crypto from 'crypto';
import { request } from '../../../utils/http.js';
import { logger } from '../../../utils/logger.js';

@Provide()
@Scope(ScopeEnum.Singleton)
export class PlusService {
  @Inject()
  sysSettingsService: SysSettingsService;
  @Config('plus.server.baseUrl')
  plusServerBaseUrl;

  async requestWithoutSign(config: any) {
    config.baseURL = this.plusServerBaseUrl;
    return await request(config);
  }

  async request(config: any) {
    if (!isPlus()) {
      throw new Error('您还不是专业版，请先激活专业版');
    }
    const { url, data } = config;
    const timestamps = Date.now();
    const installInfo: SysInstallInfo = await this.sysSettingsService.getSetting(SysInstallInfo);
    const sign = await this.sign(data, timestamps);

    const requestHeader = {
      subjectId: installInfo.siteId,
      appKey: AppKey,
      sign: sign,
      timestamps: timestamps,
    };
    let requestHeaderStr = JSON.stringify(requestHeader);
    requestHeaderStr = Buffer.from(requestHeaderStr).toString('base64');
    const headers = {
      'Content-Type': 'application/json',
      'X-Plus-Subject': requestHeaderStr,
    };
    return await request({
      url: url,
      baseURL: this.plusServerBaseUrl,
      method: 'POST',
      data: data,
      headers: headers,
    });
  }

  async sign(body: any, timestamps: number) {
    //content := fmt.Sprintf("%s.%d.%s", in.Params, in.Timestamps, secret)
    const params = JSON.stringify(body);
    const plusInfo = getPlusInfo();
    const secret = plusInfo.secret;
    if (!secret) {
      const randomTime = Math.floor(Math.random() * 3 * 60 * 1000 + 30 * 1000);
      setTimeout(() => {
        process.exit();
      }, randomTime);
      return 'xxxxx';
    }
    const content = `${params}.${timestamps}.${secret}`;

    // sha256
    const sign = crypto.createHash('sha256').update(content).digest('base64');
    logger.info('content:', content, 'sign:', sign);
    return sign;
  }

  async active(formData: { code: any; appKey: string; subjectId: string }) {
    return await this.requestWithoutSign({
      url: '/activation/active',
      method: 'post',
      data: formData,
    });
  }
}
