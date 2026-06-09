import { AbstractDnsProvider, CreateRecordOptions, DomainRecord, IsDnsProvider, RemoveRecordOptions } from "@certd/plugin-cert";
import { AwsClient } from "./libs/aws-client.js";
import { AwsAccess } from "./access.js";
import { PageRes, PageSearch } from "@certd/pipeline";

@IsDnsProvider({
  name: "aws-route53",
  title: "AWS Route53",
  desc: "AWS Route53 DNS解析提供商",
  accessType: "aws",
  icon: "svg:icon-aws",
  order: 0,
})
export class AwsRoute53Provider extends AbstractDnsProvider {
  client: AwsClient;
  async onInstance() {
    const access: AwsAccess = this.ctx.access as AwsAccess;
    this.client = new AwsClient({ access: access, logger: this.logger, region: access.region || "us-east-1" });
  }

  async createRecord(options: CreateRecordOptions): Promise<any> {
    const { fullRecord, value, type, domain } = options;
    this.logger.info("添加域名解析：", fullRecord, value, domain);
    // const domain = await this.matchDomain(fullRecord);

    const { ZoneId, ZoneName } = await this.client.route53GetHostedZoneId(domain);
    this.logger.info(`获取到hostedZoneId:${ZoneId},name:${ZoneName},domain:${domain}`);

    await this.client.route53ChangeRecord({
      hostedZoneId: ZoneId,
      fullRecord: fullRecord,
      type: type,
      value: value,
      action: "UPSERT",
    });
    return {
      hostedZoneId: ZoneId,
    };
  }

  async removeRecord(options: RemoveRecordOptions<any>): Promise<any> {
    const { fullRecord, value, type } = options.recordReq;
    const record = options.recordRes;
    const hostedZoneId = record.hostedZoneId;

    try {
      await this.client.route53ChangeRecord({
        hostedZoneId: hostedZoneId,
        fullRecord: fullRecord,
        type: type,
        value: value,
        action: "DELETE",
      });
    } catch (e) {
      this.logger.warn(`删除域名解析失败：${e.message} : ${hostedZoneId} ${fullRecord} ${value} ${type} `);
    }
  }

  async getDomainListPage(req: PageSearch): Promise<PageRes<DomainRecord>> {
    return await this.client.route53ListHostedZonesPage(req);
  }
}

new AwsRoute53Provider();
