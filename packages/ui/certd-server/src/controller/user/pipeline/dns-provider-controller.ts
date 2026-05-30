import { ALL, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import { DnsProviderService } from "../../../modules/pipeline/service/dns-provider-service.js";
import { BaseController } from "@certd/lib-server";
import { Constants } from "@certd/lib-server";
import { ApiTags } from "@midwayjs/swagger";

/**
 * 插件
 */
@Provide()
@Controller("/api/pi/dnsProvider")
@ApiTags(["pipeline-dns-provider"])
export class DnsProviderController extends BaseController {
  @Inject()
  service: DnsProviderService;

  @Post("/list", { description: Constants.per.authOnly, summary: "查询DNS提供商列表" })
  async list(@Query(ALL) query: any) {
    const list = this.service.getList();
    return this.ok(list);
  }

  @Post("/dnsProviderTypeDict", { description: Constants.per.authOnly, summary: "查询DNS提供商类型字典" })
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
