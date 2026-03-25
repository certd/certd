import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { optionsUtils } from "@certd/basic";
import { VolcengineAccess } from "../access.js";
import { VolcengineCdnClient } from "../cdn-client.js";

@IsTaskPlugin({
  name: 'VolcengineDeployToCDN',
  title: '火山引擎-部署证书至CDN',
  icon: 'svg:icon-volcengine',
  group: pluginGroups.volcengine.key,
  desc: '支持网页，文件下载，音视频点播',
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class VolcengineDeployToCDN extends AbstractTaskPlugin {
  @TaskInput({
    title: '域名证书',
    helper: '请选择前置任务输出的域名证书',
    component: {
      name: 'output-selector',
      from: [...CertApplyPluginNames, 'VolcengineUploadToCertCenter'],
    },
    required: true,
  })
  cert!: CertInfo | string;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];


  @TaskInput({
    title: 'Access授权',
    helper: '火山引擎AccessKeyId、AccessKeySecret',
    component: {
      name: 'access-selector',
      type: 'volcengine',
    },
    required: true,
  })
  accessId!: string;

  @TaskInput({
    title: '服务类型',
    helper: '网页，文件下载，音视频点播',
    component: {
      name: 'a-select',
      options:[
        { label: "网页", value: "web" },
        { label: "文件下载", value: "download" },
        { label: "音视频点播", value: 'video'},
      ]
    },
    value: 'web',
    required: true,
  })
  serviceType:string = "web"




  @TaskInput(
    createRemoteSelectInputDefine({
      title: 'CDN加速域名',
      helper: '你在火山引擎上配置的CDN加速域名，比如:certd.docmirror.cn',
      action: VolcengineDeployToCDN.prototype.onGetDomainList.name,
      watches: ['certDomains', 'accessId', 'serviceType'],
      required: true,
    })
  )
  domainName!: string | string[];


  async onInstance() {}
  async execute(): Promise<void> {
    this.logger.info('开始部署证书到火山引擎CDN');
    const access = await this.getAccess<VolcengineAccess>(this.accessId);

    const client = await this.getClient(access)
    const service = await client.getCdnClient()
    if (!this.cert) {
      throw new Error('你还未选择证书');
    }
    let certId = this.cert
    if (typeof certId !== 'string') {
      const certInfo = this.cert as CertInfo
      this.logger.info(`开始上传证书`)
      certId = await client.uploadCert(certInfo, this.appendTimeSuffix('certd'))
      this.logger.info(`上传证书成功：${certId}`);
    }else{
      this.logger.info(`使用已有证书ID：${certId}`);
    }

    for (const domain of this.domainName) {
      this.logger.info(`开始部署域名${domain}证书`)
      await service.UpdateCdnConfig({
        Domain: domain,
        HTTPS: {
          CertInfo: { CertId: certId as string },
          Switch: true,
        }
      })
      this.logger.info(`部署域名${domain}证书成功`);
      await this.ctx.utils.sleep(1000)
    }

    this.logger.info('部署完成');
  }


  async getClient(access: VolcengineAccess) {
    return   new VolcengineCdnClient({
      logger: this.logger,
      access,
      http:this.http
    })
  }

  async onGetDomainList(data: any) {
    if (!this.accessId) {
      throw new Error('请选择Access授权');
    }
    const access = await this.getAccess<VolcengineAccess>(this.accessId);

    const client = await this.getClient(access);
    const service = await client.getCdnClient()
    const res = await service.ListCdnDomains({
      ServiceType: this.serviceType,
      PageNum: 1,
      PageSize: 100,
    })
    // @ts-ignore
    const list = res?.Result?.Data
    if (!list || list.length === 0) {
      throw new Error('找不到加速域名，您可以手动输入');
    }
    const options = list.map((item: any) => {
      return {
        value: item.Domain,
        label: item.Domain,
        domain: item.Domain,
      };
    });
    return optionsUtils.buildGroupOptions(options, this.certDomains);
  }
}
new VolcengineDeployToCDN();
