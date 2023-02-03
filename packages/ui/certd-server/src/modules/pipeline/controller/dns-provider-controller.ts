import {
  ALL,
  Controller,
  Inject,
  Post,
  Provide,
  Query,
} from '@midwayjs/decorator';
import { DnsProviderService } from '../service/dns-provider-service';
import { BaseController } from '../../../basic/base-controller';

/**
 * 插件
 */
@Provide()
@Controller('/api/pi/dnsProvider')
export class DnsProviderController extends BaseController {
  @Inject()
  service: DnsProviderService;

  @Post('/list')
  async list(@Query(ALL) query) {
    query.userId = this.ctx.user.id;
    const list = this.service.getList();
    return this.ok(list);
  }

  @Post('/dnsProviderTypeDict')
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
