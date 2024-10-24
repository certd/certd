import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput, TaskOutput } from '@certd/pipeline';
import { appendTimeSuffix, checkRet } from '../../utils/index.js';
import { AliyunAccess, AliyunClient } from '@certd/plugin-plus';

@IsTaskPlugin({
  name: 'uploadCertToAliyun',
  title: '上传证书到阿里云',
  icon: 'ant-design:aliyun-outlined',
  group: pluginGroups.aliyun.key,
  desc: '',
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class UploadCertToAliyun extends AbstractTaskPlugin {
  @TaskInput({
    title: '证书名称',
    helper: '证书上传后将以此参数作为名称前缀',
  })
  name!: string;

  @TaskInput({
    title: '大区',
    value: 'cn-hangzhou',
    component: {
      name: 'a-auto-complete',
      vModel: 'value',
      options: [{ value: 'cn-hangzhou' }, { value: 'eu-central-1' }, { value: 'ap-southeast-1' }],
    },
    required: true,
  })
  regionId!: string;

  @TaskInput({
    title: '域名证书',
    helper: '请选择前置任务输出的域名证书',
    component: {
      name: 'output-selector',
      from: ['CertApply', 'CertApplyLego'],
    },
    required: true,
  })
  cert!: any;

  @TaskInput({
    title: 'Access授权',
    helper: '阿里云授权AccessKeyId、AccessKeySecret',
    component: {
      name: 'access-selector',
      type: 'aliyun',
    },
    required: true,
  })
  accessId!: string;

  @TaskOutput({
    title: '上传成功后的阿里云CertId',
  })
  aliyunCertId!: string;

  async onInstance() {}

  async execute(): Promise<void> {
    this.logger.info('开始部署证书到阿里云cdn');
    const access: AliyunAccess = await this.accessService.getById(this.accessId);
    const client = await this.getClient(access);
    const certName = appendTimeSuffix(this.name);
    const params = {
      RegionId: this.regionId || 'cn-hangzhou',
      Name: certName,
      Cert: this.cert.crt,
      Key: this.cert.key,
    };

    const requestOption = {
      method: 'POST',
    };

    const ret: any = await client.request('CreateUserCertificate', params, requestOption);
    checkRet(ret);
    this.logger.info('证书上传成功：aliyunCertId=', ret.CertId);

    //output
    this.aliyunCertId = ret.CertId;
  }

  async getClient(aliyunProvider: AliyunAccess) {
    const client = new AliyunClient({ logger: this.logger });
    await client.init({
      accessKeyId: aliyunProvider.accessKeyId,
      accessKeySecret: aliyunProvider.accessKeySecret,
      endpoint: 'https://cas.aliyuncs.com',
      apiVersion: '2020-04-07',
    });
    return client;
  }
}
//注册插件
new UploadCertToAliyun();
