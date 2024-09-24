import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from '@certd/pipeline';
import { CertInfo, CertReader } from '@certd/plugin-cert';
import { DogeClient } from '../../lib/index.js';
import dayjs from 'dayjs';

@IsTaskPlugin({
  name: 'DogeCloudDeployToCDN',
  title: '部署证书到多吉云CDN',
  icon: 'svg:icon-dogecloud',
  group: pluginGroups.cdn.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class DogeCloudDeployToCDNPlugin extends AbstractTaskPlugin {
  @TaskInput({
    title: '域名',
    helper: 'CDN域名',
    required: true,
  })
  domain!: string;
  //证书选择，此项必须要有
  @TaskInput({
    title: '证书',
    helper: '请选择前置任务输出的域名证书',
    component: {
      name: 'pi-output-selector',
      from: ['CertApply', 'CertApplyLego'],
    },
    required: true,
  })
  cert!: CertInfo;

  //授权选择框
  @TaskInput({
    title: '多吉云授权',
    helper: '多吉云AccessKey',
    component: {
      name: 'pi-access-selector',
      type: 'dogecloud',
    },
    rules: [{ required: true, message: '此项必填' }],
  })
  accessId!: string;

  @TaskInput({
    title: '忽略部署接口报错',
    helper: '当该域名部署后报错，但是实际上已经部署成功时，可以勾选',
    value: false,
    component: {
      name: 'a-switch',
      type: 'checked',
    },
  })
  ignoreDeployNullCode = false;

  dogeClient!: DogeClient;

  async onInstance() {
    const access = await this.accessService.getById(this.accessId);
    this.dogeClient = new DogeClient(access, this.ctx.http);
  }
  async execute(): Promise<void> {
    const certId: number = await this.updateCert();
    await this.bindCert(certId);
  }

  async updateCert() {
    const certReader = new CertReader(this.cert);
    const data = await this.dogeClient.request('/cdn/cert/upload.json', {
      note: 'certd-' + dayjs().format('YYYYMMDDHHmmss'),
      cert: certReader.crt,
      private: certReader.key,
    });
    return data.id;
  }

  async bindCert(certId: number) {
    await this.dogeClient.request(
      '/cdn/cert/bind.json',
      {
        id: certId,
        domain: this.domain,
      },
      this.ignoreDeployNullCode
    );
  }
}
new DogeCloudDeployToCDNPlugin();
