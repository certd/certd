import { AbstractDnsProvider, CreateRecordOptions, DomainRecord, IsDnsProvider, RemoveRecordOptions } from "@certd/plugin-cert";
import { SpaceshipAccess } from "./access.js";
import { PageRes, PageSearch } from "@certd/pipeline";

export type SpaceshipRecord = {
  id: string;
  name: string;
  type: string;
  content: string;
  domainId: string;
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
      url: `https://spaceship.dev/api/v1/domains/${domain}/records`,
      method: "POST",
      data: {
        force: false,
        items: [
          {
            type: type,
            value: value,
            name: hostRecord,
            ttl: 300
          }
        ]
      }
    });

    return {
      id: recordRes.items[0].id,
      name: hostRecord,
      type: type,
      content: value,
      domainId: domain
    };
  }

  async removeRecord(options: RemoveRecordOptions<SpaceshipRecord>): Promise<void> {
    const recordRes = options.recordRes;
    this.logger.info("删除域名解析：", recordRes);

    await this.access.doRequest({
      url: `https://spaceship.dev/api/v1/domains/${recordRes.domainId}/records`,
      method: "DELETE",
      data: {
        Records: [
          {
            type: recordRes.type,
            value: recordRes.content,
            name: recordRes.name
          }
        ]
      }
    });

    this.logger.info("删除域名解析成功:", recordRes.name);
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