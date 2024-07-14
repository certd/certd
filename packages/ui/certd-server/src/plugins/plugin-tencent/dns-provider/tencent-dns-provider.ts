import { Autowire, HttpClient, ILogger } from '@certd/pipeline';
import {
  AbstractDnsProvider,
  CreateRecordOptions,
  IsDnsProvider,
  RemoveRecordOptions,
} from '@certd/plugin-cert';
import { TencentAccess } from '../access/index.js';
import * as tencentcloud from 'tencentcloud-sdk-nodejs';

const DnspodClient = tencentcloud.dnspod.v20210323.Client;
@IsDnsProvider({
  name: 'tencent',
  title: '腾讯云',
  desc: '腾讯云域名DNS解析提供者',
  accessType: 'tencent',
})
export class TencentDnsProvider extends AbstractDnsProvider {
  @Autowire()
  http!: HttpClient;

  @Autowire()
  access!: TencentAccess;
  @Autowire()
  logger!: ILogger;

  client!: any;

  endpoint = 'dnspod.tencentcloudapi.com';

  async onInstance() {
    const clientConfig = {
      credential: this.access,
      region: '',
      profile: {
        httpProfile: {
          endpoint: this.endpoint,
        },
      },
    };

    // 实例化要请求产品的client对象,clientProfile是可选的
    this.client = new DnspodClient(clientConfig);
  }

  async createRecord(options: CreateRecordOptions): Promise<any> {
    const { fullRecord, value, type, domain } = options;
    this.logger.info('添加域名解析：', fullRecord, value);
    const rr = fullRecord.replace('.' + domain, '');

    const params = {
      Domain: domain,
      RecordType: type,
      RecordLine: '默认',
      Value: value,
      SubDomain: rr,
    };

    try {
      const ret = await this.client.CreateRecord(params);
      this.logger.info(
        '添加域名解析成功:',
        fullRecord,
        value,
        JSON.stringify(ret)
      );
      /*
        {
        "RecordId": 162,
        "RequestId": "ab4f1426-ea15-42ea-8183-dc1b44151166"
      }
   */
      return ret;
    } catch (e: any) {
      if (e?.code === 'InvalidParameter.DomainRecordExist') {
        this.logger.info('域名解析已存在,无需重复添加:', fullRecord, value);
        return {};
      }
      throw e;
    }
  }

  async removeRecord(options: RemoveRecordOptions<any>) {
    const { fullRecord, value, domain, record } = options;

    const params = {
      Domain: domain,
      RecordId: record.RecordId,
    };
    const ret = await this.client.DeleteRecord(params);
    this.logger.info('删除域名解析成功:', fullRecord, value);
    return ret;
  }
}
new TencentDnsProvider();
