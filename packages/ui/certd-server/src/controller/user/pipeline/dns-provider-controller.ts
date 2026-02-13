import { ALL, Controller, Inject, Post, Provide, Query } from '@midwayjs/core';
import { DnsProviderService } from '../../../modules/pipeline/service/dns-provider-service.js';
import { BaseController } from '@certd/lib-server';
import { Constants } from '@certd/lib-server';

/**
 * 插件
 */
@Provide()
@Controller('/api/pi/dnsProvider')
export class DnsProviderController extends BaseController {
  @Inject()
  service: DnsProviderService;

  @Post('/list', { summary: Constants.per.authOnly })
  async list(@Query(ALL) query: any) {
    const list = this.service.getList();
    return this.ok(list);
  }

  @Post('/dnsProviderTypeDict', { summary: Constants.per.authOnly })
  async getDnsProviderTypeDict() {
    const list = this.service.getList();
    const dict = [];
    for (const item of list) {
      dict.push({
        value: item.name,
        label: item.title,
        //@ts-ignore
        accessType: item.accessType,
      });
    }
    return this.ok(dict);
  }
}
