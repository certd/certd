import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput, TaskOutput } from '@certd/pipeline';
import { appendTimeSuffix, checkRet } from '../../utils/index.js';
import { AliyunAccess } from "@certd/plugin-plus";

@IsTaskPlugin({
  name: 'uploadCertToAliyun',
  title: '上传证书到阿里云',
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
      name: 'pi-output-selector',
      from: 'CertApply',
    },
    required: true,
  })
  cert!: any;

  @TaskInput({
    title: 'Access授权',
    helper: '阿里云授权AccessKeyId、AccessKeySecret',
    component: {
      name: 'pi-access-selector',
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
    const Core = await import('@alicloud/pop-core');
    return new Core.default({
      accessKeyId: aliyunProvider.accessKeyId,
      accessKeySecret: aliyunProvider.accessKeySecret,
      endpoint: 'https://cas.aliyuncs.com',
      apiVersion: '2018-07-13',
    });
  }
}
//注册插件
new UploadCertToAliyun();
