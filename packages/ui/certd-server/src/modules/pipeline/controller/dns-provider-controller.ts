import { ALL, Controller, Inject, Post, Provide, Query } from '@midwayjs/core';
import { DnsProviderService } from '../service/dns-provider-service.js';
import { BaseController } from '../../../basic/base-controller.js';
import { Constants } from '../../../basic/constants.js';

/**
 * 插件
 */
@Provide()
@Controller('/api/pi/dnsProvider')
export class DnsProviderController extends BaseController {
  @Inject()
  service: DnsProviderService;

  @Post('/list', { summary: Constants.per.authOnly })
  async list(@Query(ALL) query) {
    query.userId = this.ctx.user.id;
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
      });
    }
    return this.ok(dict);
  }
}
