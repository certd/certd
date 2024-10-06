import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from '@certd/pipeline';
import { QiniuAccess, QiniuClient } from '@certd/plugin-plus';
import { CertInfo } from '@certd/plugin-cert';

@IsTaskPlugin({
  name: 'QiniuDeployCertToCDN',
  title: '部署证书至七牛CDN',
  icon: 'svg:icon-qiniuyun',
  group: pluginGroups.cdn.key,
  desc: '自动部署域名证书至七牛云CDN，七牛云OSS',
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class QiniuDeployCertToCDN extends AbstractTaskPlugin {
  @TaskInput({
    title: 'CDN加速域名',
    helper: '你在七牛云上配置的CDN加速域名，比如:certd.handsfree.work',
    required: true,
  })
  domainName!: string;

  @TaskInput({
    title: '域名证书',
    helper: '请选择前置任务输出的域名证书，或者上传到七牛云的证书id',
    component: {
      name: 'output-selector',
      from: ['CertApply', 'CertApplyLego', 'QiniuCertUpload'],
    },
    required: true,
  })
  cert!: CertInfo | string;

  @TaskInput({
    title: 'Access授权',
    helper: '七牛云授权',
    component: {
      name: 'access-selector',
      type: 'qiniu',
    },
    required: true,
  })
  accessId!: string;

  async onInstance() {}
  async execute(): Promise<void> {
    this.logger.info('开始部署证书到七牛云cdn');
    const access = await this.accessService.getById<QiniuAccess>(this.accessId);
    const qiniuClient = new QiniuClient({
      http: this.ctx.http,
      access,
    });
    const url = `https://api.qiniu.com/domain/${this.domainName}/httpsconf`;
    let certId = null;
    if (typeof this.cert !== 'string') {
      // 是证书id，直接上传即可
      this.logger.info('先上传证书');
      certId = await qiniuClient.uploadCert(this.cert, this.appendTimeSuffix('certd'));
    } else {
      certId = this.cert;
    }

    //开始修改证书
    this.logger.info(`开始修改证书,certId:${certId},domain:${this.domainName}`);
    const body = {
      certID: certId,
    };

    await qiniuClient.doRequest(url, 'put', body);

    this.logger.info('部署完成');
  }
}
new QiniuDeployCertToCDN();
