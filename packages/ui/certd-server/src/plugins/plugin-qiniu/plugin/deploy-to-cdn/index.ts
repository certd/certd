import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from '@certd/pipeline';
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from '@certd/plugin-lib';
import { CertInfo } from '@certd/plugin-cert';
import { optionsUtils } from '@certd/basic';
import { CertApplyPluginNames} from '@certd/plugin-cert';
import { QiniuAccess } from '../../../plugin-lib/qiniu/access.js';
import { QiniuClient } from '../../../plugin-lib/qiniu/index.js';

@IsTaskPlugin({
  name: 'QiniuDeployCertToCDN',
  title: '七牛云-部署证书至CDN/DCDN',
  icon: 'svg:icon-qiniuyun',
  group: pluginGroups.qiniu.key,
  desc: '自动部署域名证书至七牛云CDN、DCDN',
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class QiniuDeployCertToCDN extends AbstractTaskPlugin {
  @TaskInput({
    title: '域名证书',
    helper: '请选择前置任务输出的域名证书，或者上传到七牛云的证书id',
    component: {
      name: 'output-selector',
      from: [...CertApplyPluginNames, 'QiniuCertUpload'],
    },
    required: true,
  })
  cert!: CertInfo | string;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

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

  @TaskInput(
    createRemoteSelectInputDefine({
      title: 'CDN加速域名',
      helper: '你在七牛云上配置的CDN加速域名，比如:certd.handsfree.work',
      rules: [{ type: 'domains', allowDotStart: true }],
      action: QiniuDeployCertToCDN.prototype.onGetDomainList.name,
      required: true,
    })
  )
  domainName!: string | string[];

  async onInstance() {}
  async execute(): Promise<void> {
    this.logger.info('开始部署证书到七牛云cdn');
    const access = await this.getAccess<QiniuAccess>(this.accessId);
    const qiniuClient = new QiniuClient({
      http: this.ctx.http,
      access,
      logger: this.logger,
    });

    let certId = null;
    if (typeof this.cert !== 'string') {
      // 是证书id，直接上传即可
      this.logger.info('先上传证书');
      certId = await qiniuClient.uploadCert(this.cert, this.appendTimeSuffix('certd'));
    } else {
      certId = this.cert;
    }

    const domains: string[] = typeof this.domainName === 'string' ? [this.domainName] : this.domainName;
    for (const domain of domains) {
      //获取域名详情
      const getUrl = `https://api.qiniu.com/domain/${domain}`;
      const res = await qiniuClient.doRequest(getUrl, 'get');
      this.logger.info(`域名https详情:${JSON.stringify(res.https)}`);
      if (!res.https.certId) {
        this.logger.info('未开启https，即将开启https，并设置证书');
        //未开启https
        const body = {
          certId: certId,
        };
        const url = `https://api.qiniu.com/domain/${domain}/sslize`;
        await qiniuClient.doRequest(url, 'put', body);
        this.logger.info(`开启https并设置证书成功,certId:${certId},domain:${domain}`);
      } else {
        //开始修改证书
        this.logger.info(`开始修改证书,certId:${certId},domain:${domain}`);
        const body = {
          certID: certId,
          forceHttps: res.https.forceHttps,
          http2Enable: res.https.http2Enable,
        };
        const url = `https://api.qiniu.com/domain/${domain}/httpsconf`;
        await qiniuClient.doRequest(url, 'put', body);
        this.logger.info(`修改证书成功,certId:${certId},domain:${domain}`);
      }
    }

    this.logger.info('部署完成');
  }

  async onGetDomainList() {
    const access = await this.getAccess<QiniuAccess>(this.accessId);
    
    const domains = await access.getDomainList()

    const options = domains.map((item: any) => {
      return {
        value: item.name,
        label: item.name,
        domain: item.name,
      };
    });

    return optionsUtils.buildGroupOptions(options, this.certDomains);
  }
}
new QiniuDeployCertToCDN();
