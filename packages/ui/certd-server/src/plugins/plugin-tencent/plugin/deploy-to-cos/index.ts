import { IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from '@certd/pipeline';
import { CertInfo } from '@certd/plugin-cert';
import { AbstractPlusTaskPlugin, createRemoteSelectInputDefine } from '@certd/plugin-plus';
import { TencentSslClient } from '../../lib/index.js';

@IsTaskPlugin({
  name: 'DeployCertToTencentCosPlugin',
  title: '部署证书到腾讯云COS',
  needPlus: true,
  icon: 'svg:icon-tencentcloud',
  group: pluginGroups.tencent.key,
  desc: '部署到腾讯云COS源站域名证书【注意：很不稳定，需要重试很多次偶尔才能成功一次】',
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class DeployCertToTencentCosPlugin extends AbstractPlusTaskPlugin {
  /**
   * AccessProvider的id
   */
  @TaskInput({
    title: 'Access授权',
    helper: 'access授权',
    component: {
      name: 'access-selector',
      type: 'tencent',
    },
    required: true,
  })
  accessId!: string;

  @TaskInput({
    title: '存储桶名称',
    helper: '请输入存储桶名称',
  })
  bucket!: string;

  @TaskInput({
    title: '所在地域',
    helper: '存储桶所在地域',
    component: {
      name: 'a-auto-complete',
      vModel: 'value',
      options: [
        { value: '', label: '--------中国大陆地区-------', disabled: true },
        { value: 'ap-beijing-1', label: '北京1区' },
        { value: 'ap-beijing', label: '北京' },
        { value: 'ap-nanjing', label: '南京' },
        { value: 'ap-shanghai', label: '上海' },
        { value: 'ap-guangzhou', label: '广州' },
        { value: 'ap-chengdu', label: '成都' },
        { value: 'ap-chongqing', label: '重庆' },
        { value: 'ap-shenzhen-fsi', label: '深圳金融' },
        { value: 'ap-shanghai-fsi', label: '上海金融' },
        { value: 'ap-beijing-fsi', label: '北京金融' },
        { value: '', label: '--------中国香港及境外-------', disabled: true },
        { value: 'ap-hongkong', label: '中国香港' },
        { value: 'ap-singapore', label: '新加坡' },
        { value: 'ap-mumbai', label: '孟买' },
        { value: 'ap-jakarta', label: '雅加达' },
        { value: 'ap-seoul', label: '首尔' },
        { value: 'ap-bangkok', label: '曼谷' },
        { value: 'ap-tokyo', label: '东京' },
        { value: 'na-siliconvalley', label: '硅谷' },
        { value: 'na-ashburn', label: '弗吉尼亚' },
        { value: 'sa-saopaulo', label: '圣保罗' },
        { value: 'eu-frankfurt', label: '法兰克福' },
      ],
    },
  })
  region!: string;

  // @TaskInput(createCertDomainGetterInputDefine())
  // certDomains!: string[];

  @TaskInput(
    createRemoteSelectInputDefine({
      title: 'COS域名',
      helper: '请选择域名',
      typeName: DeployCertToTencentCosPlugin.name,
      action: DeployCertToTencentCosPlugin.prototype.onGetDomainList.name,
      watches: ['bucket', 'region'],
    })
  )
  domains!: string | string[];

  @TaskInput({
    title: '域名证书',
    helper: '请选择前置任务输出的域名证书，或者选择前置任务“上传证书到腾讯云”任务的证书ID',
    component: {
      name: 'output-selector',
      from: ['CertApply', 'CertApplyLego', 'UploadCertToTencent'],
    },
    required: true,
  })
  cert!: CertInfo | string;

  async onInstance() {}

  async execute(): Promise<void> {
    const access = await this.accessService.getById(this.accessId);

    const client = new TencentSslClient({
      access,
      logger: this.logger,
      region: this.region,
    });

    let tencentCertId: string = this.cert as string;
    if (typeof this.cert !== 'string') {
      tencentCertId = await client.uploadToTencent({
        certName: this.appendTimeSuffix('certd'),
        cert: this.cert,
      });
    }

    for (const domain of this.domains) {
      const params = {
        CertificateId: tencentCertId,
        ResourceType: 'cos',
        Status: 1,
        InstanceIdList: [`${this.region}#${this.bucket}#${domain}`],
      };

      const res = await client.deployCertificateInstance(params);
      this.logger.info(`域名${domain}部署成功:`, res);
    }
    this.logger.info('部署完成');
  }

  async onGetDomainList(data: any) {
    const access = await this.accessService.getById(this.accessId);

    const cosv5 = await import('cos-nodejs-sdk-v5');
    const cos = new cosv5.default({
      SecretId: access.secretId,
      SecretKey: access.secretKey,
    });
    if (!this.bucket) {
      throw new Error('存储桶名称不能为空');
    }
    if (!this.region) {
      throw new Error('所在地域不能为空');
    }

    const res = await cos.getBucketDomain({
      Bucket: this.bucket,
      /** 存储桶所在地域 @see https://cloud.tencent.com/document/product/436/6224 */
      Region: this.region,
    });

    this.ctx.logger.info('获取域名列表:', res);

    return res.DomainRule.map((item: any) => {
      return {
        label: item.Name,
        value: item.Name,
      };
    });
  }
}

// new DeployCertToTencentCosPlugin()
