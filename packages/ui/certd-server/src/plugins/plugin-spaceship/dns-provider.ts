import { AbstractDnsProvider, CreateRecordOptions, DomainRecord, IsDnsProvider, RemoveRecordOptions } from "@certd/plugin-cert";
import { SpaceshipAccess } from "./access.js";
import { PageRes, PageSearch } from "@certd/pipeline";

export type SpaceshipRecord = {
  name: string;
};

@IsDnsProvider({
  name: "spaceship",
  title: "Spaceship",
  desc: "Spaceship 域名解析",
  icon: "clarity:plugin-line",
  accessType: "spaceship",
  order: 99
})
export class SpaceshipProvider extends AbstractDnsProvider<SpaceshipRecord> {
  access!: SpaceshipAccess;

  async onInstance() {
    this.access = this.ctx.access as SpaceshipAccess;
  }

  async createRecord(options: CreateRecordOptions): Promise<SpaceshipRecord> {
    const { fullRecord, hostRecord, value, type, domain } = options;
    this.logger.info("添加域名解析：", fullRecord, value, type, domain);

    await this.access.getDomainInfo(domain);

    const recordRes = await this.access.doRequest({
      url: `https://spaceship.dev/api/v1/dns/records/${domain}`,
      method: "POST",
      data: {
        force: false,
        items: [
          {
            type: type,
            value: value,
            name: hostRecord,
            ttl: 60
          }
        ]
      }
    });

    return recordRes;
  }

  async removeRecord(options: RemoveRecordOptions<SpaceshipRecord>): Promise<void> {
    const recordReq = options.recordReq;
    this.logger.info("删除域名解析：", recordReq);

    await this.access.doRequest({
      // https://spaceship.dev/api/v1/dns/records/xxx.net
      url: `https://spaceship.dev/api/v1/dns/records/${recordReq.domain}`,
      method: "DELETE",
      data: [
        {
          type: recordReq.type,
          value: recordReq.value,
          name: recordReq.hostRecord
        }
      ]
    });

    this.logger.info("删除域名解析成功:", JSON.stringify(recordReq));
  }

  async getDomainListPage(req: PageSearch): Promise<PageRes<DomainRecord>> {
    const res = await this.access.GetDomainList(req);
    
    const list = res.list.map((item: any) => ({
      domain: item.name,
      id: item.name
    }));
    
    return {
      total: res.total || 0,
      list: list || []
    };
  }
}

new SpaceshipProvider();