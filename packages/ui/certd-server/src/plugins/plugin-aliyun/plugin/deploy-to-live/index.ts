import { AbstractTaskPlugin, IsTaskPlugin, PageSearch, pluginGroups, RunStrategy, TaskInput } from '@certd/pipeline';
import { CertApplyPluginNames } from '@certd/plugin-cert';
import { CertInfo, createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from '@certd/plugin-lib';
import { AliyunAccess } from '../../../plugin-lib/aliyun/access/index.js';
import { AliyunSslClient, CasCertId } from '../../../plugin-lib/aliyun/lib/index.js';

@IsTaskPlugin({
  name: 'DeployCertToAliyunLive',
  title: '阿里云-部署至直播（Live）',
  icon: 'svg:icon-aliyun',
  group: pluginGroups.aliyun.key,
  desc: '部署证书到阿里云视频直播（Live）域名',
  needPlus: false,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class DeployCertToAliyunLive extends AbstractTaskPlugin {
  

  @TaskInput({
    title: '域名证书',
    helper: '请选择前置任务输出的域名证书',
    component: {
      name: 'output-selector',
      from: [...CertApplyPluginNames, 'uploadCertToAliyun'],
    },
    template: false,
    required: true,
  })
  cert!: CertInfo | CasCertId;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];


  @TaskInput({
    title: 'Access授权',
    helper: '阿里云授权AccessKeyId、AccessKeySecret',
    component: {
      name: 'access-selector',
      type: 'aliyun',
    },
    required: true,
  })
  accessId!: string;

  @TaskInput({
    title: '证书服务接入点',
    helper: '不会选就按默认',
    value: 'cas.aliyuncs.com',
    component: {
      name: 'a-select',
      options: [
        { value: 'cas.aliyuncs.com', label: '中国大陆' },
        { value: 'cas.ap-southeast-1.aliyuncs.com', label: '新加坡' },
        { value: 'cas.eu-central-1.aliyuncs.com', label: '德国（法兰克福）' },
      ],
    },
    required: true,
  })
  endpoint!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: '直播域名',
      helper: '请选择要部署证书的直播域名',
      typeName: 'DeployCertToAliyunLive',
      action: DeployCertToAliyunLive.prototype.onGetDomainList.name,
      watches: ['certDomains', 'accessId'],
      pager: true,
      search: true,
    })
  )
  domainList!: string[];

  async onInstance() {}

  async execute(): Promise<void> {
    this.logger.info('开始部署证书到阿里云直播');
    const access = await this.getAccess<AliyunAccess>(this.accessId);

    if (this.cert == null) {
      throw new Error('域名证书参数为空，请检查前置任务');
    }

    const client = await this.getClient(access);
    const sslClient = new AliyunSslClient({
      access,
      logger: this.logger,
      endpoint: this.endpoint || 'cas.aliyuncs.com',
    });

    // 确保证书已上传到 CAS，统一使用 cas 方式部署
    const casCert = await sslClient.uploadCertOrGet(this.cert);
    // const certName = this.appendTimeSuffix(this.certName || casCert.certName);
    for (const domain of this.domainList) {
      const res = await client.doRequest({
        action: 'SetLiveDomainCertificate',
        version: '2016-11-01',
        protocol: 'HTTPS',
        data: {
          query: {
            DomainName: domain,
            CertName: casCert.certName,
            CertType: 'cas',
            SSLProtocol: 'on',
            CertId: casCert.certId,
          },
        },
      });
      this.logger.info('部署直播域名[' + domain + ']证书成功：' + JSON.stringify(res));
    }
  }

  async getClient(access: AliyunAccess) {
    const endpoint = 'live.aliyuncs.com';
    return access.getClient(endpoint);
  }

  async onGetDomainList(data: PageSearch) {
    if (!this.accessId) {
      throw new Error('请选择Access授权');
    }
    const access = await this.getAccess<AliyunAccess>(this.accessId);
    const client = await this.getClient(access);

    const res = await client.doRequest({
      action: 'DescribeLiveUserDomains',
      version: '2016-11-01',
      protocol: 'HTTPS',
      data: {
        query: {
          DomainName: data.searchKey || undefined,
          PageNumber: data.pageNo || 1,
          PageSize: data.pageSize || 50,
        },
      },
    });

    const list = res?.Domains?.PageData;
    if (!list || list.length === 0) {
      throw new Error('没有找到直播域名，请先在阿里云添加直播域名');
    }

    const options = list.map((item: any) => {
      return {
        label: item.DomainName,
        value: item.DomainName,
        domain: item.DomainName,
      };
    });
    return this.ctx.utils.options.buildGroupOptions(options, this.certDomains);
  }
}

new DeployCertToAliyunLive();
