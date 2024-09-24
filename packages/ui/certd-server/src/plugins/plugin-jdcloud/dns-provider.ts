import { AbstractDnsProvider, CreateRecordOptions, IsDnsProvider, RemoveRecordOptions } from '@certd/plugin-cert';
import { Autowire, ILogger } from '@certd/pipeline';
import { JDCloudAccess } from './access.js';
function promisfy(func: any) {
  return (params: any, regionId: string) => {
    return new Promise((resolve, reject) => {
      func(params, regionId, (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result);
      });
    });
  };
}

// 这里通过IsDnsProvider注册一个dnsProvider
@IsDnsProvider({
  name: 'jdcloud',
  title: '京东云',
  desc: '京东云 dns provider',
  // 这里是对应的 cloudflare的access类型名称
  accessType: 'jdcloud',
})
export class JDCloudDnsProvider extends AbstractDnsProvider {
  // 通过Autowire传递context
  @Autowire()
  logger!: ILogger;
  access!: JDCloudAccess;
  service!: any;
  regionId: string;
  async onInstance() {
    this.access = this.ctx.access as JDCloudAccess;
    const { DomainService } = await import('@certd/lib-jdcloud');
    // @ts-ignore
    this.regionId = 'cn-north-1';
    this.service = new DomainService({
      credentials: {
        accessKeyId: this.access.accessKeyId,
        secretAccessKey: this.access.accessKeySecret,
      },
      regionId: this.regionId,
    });
  }

  /**
   * 创建dns解析记录，用于验证域名所有权
   */
  async createRecord(options: CreateRecordOptions) {
    /**
     * fullRecord: '_acme-challenge.test.example.com',
     * value: 一串uuid
     * type: 'TXT',
     * domain: 'example.com'
     */
    const { fullRecord, value, type, domain } = options;
    this.logger.info('添加域名解析：', fullRecord, value, type, domain);

    const describeDomains = promisfy(this.service.describeDomains);

    const res: any = await describeDomains({ domainName: domain, pageNumber: 1, pageSize: 10 }, this.regionId);

    if (res.dataList.length === 0) {
      throw new Error('账号下找不到域名:' + domain);
    }
    const domainId = res.dataList[0].id;

    //开始创建解析记录
    const createResourceRecord = promisfy(this.service.createResourceRecord);
    const res2: any = await createResourceRecord(
      {
        domainId,
        req: {
          hostRecord: fullRecord,
          hostValue: value,
          type: 'TXT',
        },
      },
      this.regionId
    );

    const recordId = res2.dataList[0].id;

    this.logger.info(`添加域名解析成功:fullRecord=${fullRecord},value=${value}`);
    this.logger.info(`请求结果:recordId:${recordId}`);

    //本接口需要返回本次创建的dns解析记录，这个记录会在删除的时候用到
    return { id: recordId, domainId };
  }

  /**
   *  删除dns解析记录,清理申请痕迹
   * @param opts
   */
  async removeRecord(opts: RemoveRecordOptions<any>): Promise<void> {
    const { record } = opts;
    const deleteResourceRecord = promisfy(this.service.deleteResourceRecord);
    const res = await deleteResourceRecord(
      {
        domainId: record.domainId,
        resourceRecordId: record.id,
      },
      this.regionId
    );
    this.logger.info(`删除dns解析记录成功：${JSON.stringify(res)}`);
  }
}

//实例化这个provider，将其自动注册到系统中
new JDCloudDnsProvider();
