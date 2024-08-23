import { Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { SysSettingsService } from '../../system/service/sys-settings-service.js';
import { SysInstallInfo } from '../../system/service/models.js';
import { appKey, getPlusInfo } from '@certd/pipeline';
import * as crypto from 'crypto';
import { request } from '../../../utils/http.js';
import { logger } from '../../../utils/logger.js';

@Provide()
@Scope(ScopeEnum.Singleton)
export class PlusService {
  @Inject()
  sysSettingsService: SysSettingsService;

  async request(url: string, data: any) {
    const timestamps = Date.now();
    const installInfo: SysInstallInfo = await this.sysSettingsService.getSetting(SysInstallInfo);
    const sign = await this.sign(data, timestamps);

    const requestHeader = {
      subjectId: installInfo.siteId,
      appKey: appKey,
      sign: sign,
      timestamps: timestamps,
    };
    let requestHeaderStr = JSON.stringify(requestHeader);
    requestHeaderStr = Buffer.from(requestHeaderStr).toString('base64');
    const headers = {
      'Content-Type': 'application/json',
      'X-Plus-Subject': requestHeaderStr,
    };
    const baseUrl = 'http://127.0.0.1:11007';
    return await request({
      url: url,
      baseURL: baseUrl,
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
    const content = `${params}.${timestamps}.${secret}`;

    // sha256
    const sign = crypto.createHash('sha256').update(content).digest('base64');
    logger.info('content:', content, 'sign:', sign);
    return sign;
  }
}
