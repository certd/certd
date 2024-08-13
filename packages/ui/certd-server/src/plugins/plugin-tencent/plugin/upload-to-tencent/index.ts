import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput, TaskOutput } from '@certd/pipeline';
import tencentcloud from 'tencentcloud-sdk-nodejs';
import dayjs from 'dayjs';

@IsTaskPlugin({
  name: 'UploadCertToTencent',
  title: '上传证书到腾讯云',
  desc: '上传成功后输出：tencentCertId',
  group: pluginGroups.tencent.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class UploadToTencentPlugin extends AbstractTaskPlugin {
  @TaskInput({ title: '证书名称' })
  name!: string;

  @TaskInput({
    title: 'Access授权',
    helper: 'access授权',
    component: {
      name: 'pi-access-selector',
      type: 'tencent',
    },
    required: true,
  })
  accessId!: string;

  @TaskInput({
    title: '域名证书',
    helper: '请选择前置任务输出的域名证书',
    component: {
      name: 'pi-output-selector',
    },
    required: true,
  })
  cert!: any;

  @TaskOutput({
    title: '上传成功后的腾讯云CertId',
  })
  tencentCertId?: string;

  async onInstance() {}

  async execute(): Promise<void> {
    const { accessId, name, cert } = this;
    const accessProvider = await this.accessService.getById(accessId);
    const certName = this.appendTimeSuffix(name || cert.domain);
    const client = this.getClient(accessProvider);

    const params = {
      CertificatePublicKey: cert.crt,
      CertificatePrivateKey: cert.key,
      Alias: certName,
    };
    const ret = await client.UploadCertificate(params);
    this.checkRet(ret);
    this.logger.info('证书上传成功：tencentCertId=', ret.CertificateId);

    this.tencentCertId = ret.CertificateId;
  }

  appendTimeSuffix(name: string) {
    if (name == null) {
      name = 'certd';
    }
    return name + '-' + dayjs().format('YYYYMMDD-HHmmss');
  }

  getClient(accessProvider: any) {
    const SslClient = tencentcloud.ssl.v20191205.Client;

    const clientConfig = {
      credential: {
        secretId: accessProvider.secretId,
        secretKey: accessProvider.secretKey,
      },
      region: '',
      profile: {
        httpProfile: {
          endpoint: 'ssl.tencentcloudapi.com',
        },
      },
    };

    return new SslClient(clientConfig);
  }

  // async rollback({ input }) {
  //   const { accessId } = input;
  //   const accessProvider = await this.accessService.getById(accessId);
  //   const client = this.getClient(accessProvider);
  //
  //   const { tencentCertId } = context;
  //   const params = {
  //     CertificateId: tencentCertId,
  //   };
  //   const ret = await client.DeleteCertificate(params);
  //   this.checkRet(ret);
  //   this.logger.info("证书删除成功：DeleteResult=", ret.DeleteResult);
  //   delete context.tencentCertId;
  // }
  checkRet(ret: any) {
    if (!ret || ret.Error) {
      throw new Error('执行失败：' + ret.Error.Code + ',' + ret.Error.Message);
    }
  }
}
