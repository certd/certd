import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput, TaskOutput } from '@certd/pipeline';
import { QiniuAccess } from '../../access/index.js';
import { CertInfo } from '@certd/plugin-cert';
import { uploadCert } from '../lib/sdk.js';

@IsTaskPlugin({
  name: 'QiniuCertUpload',
  title: '上传到七牛云',
  icon: 'svg:icon-qiniuyun',
  group: pluginGroups.cdn.key,
  desc: '上传到七牛云',
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class QiniuCertUpload extends AbstractTaskPlugin {
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
      from: ['CertApply', 'CertApplyLego'],
    },
    required: true,
  })
  cert!: CertInfo;

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

  @TaskOutput({
    title: '上传成功后的七牛云CertId',
  })
  qiniuCertId!: string;

  async onInstance() {}
  async execute(): Promise<void> {
    this.logger.info('开始上传证书到七牛云');
    const access = (await this.accessService.getById(this.accessId)) as QiniuAccess;
    this.qiniuCertId = await uploadCert(this.ctx.http, access, this.cert, this.appendTimeSuffix(this.certName));
    this.logger.info('上传完成,id:', this.qiniuCertId);
  }
}
new QiniuCertUpload();
