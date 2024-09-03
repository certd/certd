import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from '@certd/pipeline';
import dayjs from 'dayjs';
import { AliyunAccess } from "@certd/plugin-plus";
@IsTaskPlugin({
  name: 'DeployCertToAliyunDCDN',
  title: '部署证书至阿里云DCDN',
  group: pluginGroups.aliyun.key,
  desc: '依赖证书申请前置任务，自动部署域名证书至阿里云DCDN',
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class DeployCertToAliyunDCDN extends AbstractTaskPlugin {
  @TaskInput({
    title: 'DCDN加速域名',
    helper: '你在阿里云上配置的CDN加速域名，比如:certd.docmirror.cn',
    required: true,
  })
  domainName!: string;

  @TaskInput({
    title: '证书名称',
    helper: '上传后将以此名称作为前缀备注',
  })
  certName!: string;

  @TaskInput({
    title: '域名证书',
    helper: '请选择前置任务输出的域名证书',
    component: {
      name: 'pi-output-selector',
      from: 'CertApply',
    },
    required: true,
  })
  cert!: string;

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

  async onInstance() {}
  async execute(): Promise<void> {
    this.logger.info('开始部署证书到阿里云DCDN');
    const access = (await this.accessService.getById(this.accessId)) as AliyunAccess;
    const client = await this.getClient(access);
    const params = await this.buildParams();
    await this.doRequest(client, params);
    this.logger.info('部署完成');
  }

  async getClient(access: AliyunAccess) {
    const sdk = await import('@alicloud/pop-core');
    return new sdk.default({
      accessKeyId: access.accessKeyId,
      accessKeySecret: access.accessKeySecret,
      endpoint: 'https://dcdn.aliyuncs.com',
      apiVersion: '2018-01-15',
    });
  }

  async buildParams() {
    const CertName = (this.certName ?? 'certd') + '-' + dayjs().format('YYYYMMDDHHmmss');
    const cert: any = this.cert;
    return {
      DomainName: this.domainName,
      SSLProtocol: 'on',
      CertName: CertName,
      CertType: 'upload',
      SSLPub: cert.crt,
      SSLPri: cert.key,
    };
  }

  async doRequest(client: any, params: any) {
    const requestOption = {
      method: 'POST',
      formatParams: false,
    };
    const ret: any = await client.request('SetDcdnDomainSSLCertificate', params, requestOption);
    this.checkRet(ret);
    this.logger.info('设置Dcdn证书成功:', ret.RequestId);
  }

  checkRet(ret: any) {
    if (ret.code != null) {
      throw new Error('执行失败：' + ret.Message);
    }
  }
}
new DeployCertToAliyunDCDN();
