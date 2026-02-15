import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from '@certd/pipeline';
import { CertInfo } from '@certd/plugin-cert';
import { CacheflyAccess } from '../access.js';
import { CertApplyPluginNames} from '@certd/plugin-cert';
@IsTaskPlugin({
  name: 'CacheFly',
  title: 'CacheFly-部署证书到CacheFly',
  desc: '部署证书到 CacheFly',
  icon: 'clarity:plugin-line',
  group: pluginGroups.cdn.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class CacheFlyPlugin extends AbstractTaskPlugin {
  @TaskInput({
    title: '域名证书',
    helper: '请选择前置任务输出的域名证书',
    component: {
      name: 'output-selector',
      from: [...CertApplyPluginNames],
    },
    required: true,
  })
  cert!: CertInfo;
  @TaskInput({
    title: 'Access授权',
    helper: 'CacheFly 的授权',
    component: {
      name: 'access-selector',
      type: 'CacheFly',
    },
    required: true,
  })
  accessId!: string;


  async onInstance() {}

 
  

  async execute(): Promise<void> {
    const { cert, accessId } = this;
    const access = (await this.getAccess(accessId)) as CacheflyAccess;
    
    const token = await access.login();
    // 更新证书
    await access.doRequestApi(
      `/api/2.6/certificates`,
      {
        certificate: cert.crt,
        certificateKey: cert.key,
      },
      'post',
      token
    );
    this.logger.info('证书更新成功');
  }
}

new CacheFlyPlugin();
