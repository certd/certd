import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from '@certd/pipeline';
import { QiniuAccess } from '../../access/index.js';
import { CertInfo } from '@certd/plugin-cert';
import { doRequest, uploadCert } from '../lib/sdk.js';

@IsTaskPlugin({
  name: 'QiniuDeployCertToCDN',
  title: '部署证书至七牛CDN',
  icon: 'svg:icon-qiniuyun',
  group: pluginGroups.cdn.key,
  desc: '自动部署域名证书至七牛云CDN',
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
      name: 'pi-output-selector',
      from: ['CertApply', 'CertApplyLego', 'QiniuCertUpload'],
    },
    required: true,
  })
  cert!: CertInfo | string;

  @TaskInput({
    title: 'Access授权',
    helper: '七牛云授权',
    component: {
      name: 'pi-access-selector',
      type: 'qiniu',
    },
    required: true,
  })
  accessId!: string;

  async onInstance() {}
  async execute(): Promise<void> {
    this.logger.info('开始部署证书到七牛云cdn');
    const access = await this.accessService.getById<QiniuAccess>(this.accessId);

    const url = `https://api.qiniu.com/domain/${this.domainName}/httpsconf`;
    let certId = null;
    if (typeof this.cert !== 'string') {
      // 是证书id，直接上传即可
      this.logger.info('先上传证书');
      certId = await uploadCert(this.ctx.http, access, this.cert, this.appendTimeSuffix('certd'));
    } else {
      certId = this.cert;
    }

    //开始修改证书
    this.logger.info('开始修改证书');
    const body = {
      certID: certId,
    };

    await doRequest(this.ctx.http, access, url, 'put', body);

    this.logger.info('部署完成');
  }
}
new QiniuDeployCertToCDN();
