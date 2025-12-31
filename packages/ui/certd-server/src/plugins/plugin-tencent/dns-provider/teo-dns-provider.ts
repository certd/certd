import { AbstractDnsProvider, CreateRecordOptions, IsDnsProvider, RemoveRecordOptions } from '@certd/plugin-cert';
import { TencentAccess } from '../../plugin-lib/tencent/access.js';

@IsDnsProvider({
    name: 'tencent-eo',
    title: '腾讯云EO DNS',
    desc: '腾讯云EO DNS解析提供者',
    accessType: 'tencent',
    icon: 'svg:icon-tencentcloud',
})
export class TencentEoDnsProvider extends AbstractDnsProvider {
    access!: TencentAccess;

    client!: any;


    async onInstance() {
        this.access = this.ctx.access as TencentAccess
        const clientConfig = {
            credential: this.access,
            region: '',
            profile: {
                httpProfile: {
                    endpoint: this.access.buildEndpoint("teo.tencentcloudapi.com"),
                },
            },
        };
        const teosdk = await import('tencentcloud-sdk-nodejs/tencentcloud/services/teo/v20220901/index.js');
        const TeoClient = teosdk.v20220901.Client;
        // 实例化要请求产品的client对象,clientProfile是可选的
        this.client = new TeoClient(clientConfig);
    }


    async getZoneId(domain: string) {

        const params = {
            "Filters": [
                {
                    "Name": "zone-name",
                    "Values": [
                        domain
                    ]
                }
            ]
        };
        const res = await this.client.DescribeZones(params);
        if (res.Zones && res.Zones.length > 0) {
            return res.Zones[0].ZoneId;
        }
        throw new Error('未找到对应的ZoneId');
    }

    async createRecord(options: CreateRecordOptions): Promise<any> {
        const { fullRecord, value, type, domain } = options;
        this.logger.info('添加域名解析：', fullRecord, value);

        const zoneId = await this.getZoneId(domain);
        const params = {
            "ZoneId": zoneId,
            "Name": fullRecord,
            "Type": type,
            "Content": value,
            "TTL": 60,
        };

        try {
            const ret = await this.client.CreateDnsRecord(params);
            this.logger.info('添加域名解析成功:', fullRecord, value, JSON.stringify(ret));
            /*
              {
              "RecordId": 162,
              "RequestId": "ab4f1426-ea15-42ea-8183-dc1b44151166"
            }
         */
            return {
                RecordId: ret.RecordId,
                ZoneId: zoneId,
            };
        } catch (e: any) {
            if (e?.code === 'ResourceInUse.DuplicateName') {
                this.logger.info('域名解析已存在,无需重复添加:', fullRecord, value);
                return await this.findRecord({
                    ...options,
                    zoneId,
                });
            }
            throw e;
        }
    }

    async findRecord(options: CreateRecordOptions & { zoneId: string }): Promise<any> {

        const { zoneId } = options;
        const params = {
            "ZoneId": zoneId,
            "Filters": [
                {
                    "Name": "name",
                    "Values": [
                        options.fullRecord
                    ]
                },
                {
                    "Name": "content",
                    "Values": [
                        options.value
                    ]
                },
                {
                    "Name": "type",
                    "Values": [
                        options.type
                    ]
                }
            ]
        };
        const ret = await this.client.DescribeRecordFilterList(params);
        if (ret.DnsRecords && ret.DnsRecords.length > 0) {
            this.logger.info('已存在解析记录:', ret.DnsRecords);
            return ret.DnsRecords[0];
        }
        return {};
    }

    async removeRecord(options: RemoveRecordOptions<any>) {
        const { fullRecord, value } = options.recordReq;
        const record = options.recordRes;
        if (!record) {
            this.logger.info('解析记录recordId为空，不执行删除', fullRecord, value);
        }

        const params = {
            "ZoneId": record.ZoneId,
            "RecordIds": [
                record.RecordId
            ]
        };

        const ret = await this.client.DeleteDnsRecords(params);
        this.logger.info('删除域名解析成功:', fullRecord, value);
        return ret;
    }
}
new TencentEoDnsProvider();
