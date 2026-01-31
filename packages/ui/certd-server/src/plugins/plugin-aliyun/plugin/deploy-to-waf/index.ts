import { AbstractTaskPlugin, IsTaskPlugin, Pager,PageSearch, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo, CertReader } from "@certd/plugin-cert";
import {
  createCertDomainGetterInputDefine,
  createRemoteSelectInputDefine
} from "@certd/plugin-lib";
import { AliyunAccess } from "../../../plugin-lib/aliyun/access/index.js";
import { AliyunClient, AliyunSslClient } from "../../../plugin-lib/aliyun/lib/index.js";

@IsTaskPlugin({
  name: 'AliyunDeployCertToWaf',
  title: '阿里云-部署至阿里云WAF',
  icon: 'svg:icon-aliyun',
  group: pluginGroups.aliyun.key,
  desc: '部署证书到阿里云WAF',
  needPlus: false,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class AliyunDeployCertToWaf extends AbstractTaskPlugin {
  @TaskInput({
    title: '域名证书',
    helper: '请选择证书申请任务输出的域名证书\n或者选择前置任务“上传证书到阿里云”任务的证书ID，可以减少上传到阿里云的证书数量',
    component: {
      name: 'output-selector',
      from: [...CertApplyPluginNames, 'uploadCertToAliyun'],
    },
    required: true,
  })
  cert!: CertInfo | number;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  @TaskInput({
    title: 'WAF接入点',
    helper: '不会选就按默认',
    value: 'cn-hangzhou',
    component: {
      name: 'a-select',
      options: [
        { value: 'cn-hangzhou', label: '中国大陆-华东1(杭州)' },
        { value: 'ap-southeast-1', label: '新加坡' },
      ],
    },
    required: true,
  })
  regionId!: string;

  @TaskInput({
    title: '证书接入点',
    helper: '跟上面保持一致即可',
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
  casEndpoint!: string;

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

  @TaskInput(
    createRemoteSelectInputDefine({
      title: 'CNAME站点',
      helper: '请选择要部署证书的CNAME站点',
      action: AliyunDeployCertToWaf.prototype.onGetCnameList.name,
      watches: ['accessId', 'regionId'],
      pager:true,
      search:true,
    })
  )
  cnameDomains!: string[];


  @TaskInput({
    title: 'TLS版本',
    value: 'tlsv1.2',
    component: {
      name: 'a-select',
      options: [
        { value: 'tlsv1', label: 'TLSv1' },
        { value: 'tlsv1.1', label: 'TLSv1.1' },
        { value: 'tlsv1.2', label: 'TLSv1.2' },
      ],
    },
    required: true,
  })
  tlsVersion!: string;

    @TaskInput({
    title: '启用TLSv3',
    value: true,
    component: {
      name: 'a-switch',
      vModel: 'checked',
    },
    required: true,
  })
  enableTLSv3!: boolean;



  async onInstance() {}

  async getWafClient(access: AliyunAccess) {
    const client = new AliyunClient({ logger: this.logger });
    await client.init({
      accessKeyId: access.accessKeyId,
      accessKeySecret: access.accessKeySecret,
      //https://wafopenapi.cn-hangzhou.aliyuncs.com
      endpoint: `https://wafopenapi.${this.regionId}.aliyuncs.com`,
      apiVersion: '2021-10-01',
    });
    return client;
  }

  async getInstanceId(client: AliyunClient) {
    const params = {
      RegionId: 'cn-hangzhou',
    };
    const res = await client.request('DescribeInstance', params);
    this.logger.info('获取实例ID', res.InstanceId);
    return res.InstanceId;
  }

  async execute(): Promise<void> {
    this.logger.info('开始部署证书到阿里云');
    const access = await this.getAccess<AliyunAccess>(this.accessId);
    let certId: any = this.cert;
    if (typeof this.cert === 'object') {
      const sslClient = new AliyunSslClient({
        access,
        logger: this.logger,
        endpoint: this.casEndpoint,
      });

      const certIdRes = await sslClient.uploadCertificate({
        name: this.buildCertName(CertReader.getMainDomain(this.cert.crt)),
        cert: this.cert,
      });
      certId = certIdRes.certId as any;
    }

    const client = await this.getWafClient(access);
    const instanceId = await this.getInstanceId(client);
    for (const siteDomain of this.cnameDomains) {
      this.logger.info('开始部署', siteDomain);
      const params = {
        RegionId: this.regionId,
        InstanceId: instanceId,
        Domain: siteDomain,
      };
      const siteDetail = await client.request('DescribeDomainDetail', params);
      this.logger.info('站点详情', JSON.stringify(siteDetail));
      const listen = siteDetail.Listen;
      if (!listen) {
        throw new Error(`没有找到${siteDomain}的监听器`);
      }
      /**
       * "HttpsPorts": [
       *       443
       *     ],
       *      "CertId": "14738336-cn-hangzhou",
       */
      const redirect = siteDetail.Redirect;
      redirect.Backends = redirect.AllBackends;
      listen.CertId = certId + '-' + this.regionId;
      if (!listen.HttpsPorts || listen.HttpsPorts.length === 0) {
        listen.HttpsPorts = [443];
      }
      const updateParams = {
        InstanceId: instanceId,
        RegionId: this.regionId,
        Redirect: JSON.stringify(redirect),
        Listen: JSON.stringify(listen),
        Domain: siteDomain,
        TLSVersion: this.tlsVersion || 'tlsv1.2',
        EnableTLSv3: this.enableTLSv3 ?? true,
      };
      const res = await client.request('ModifyDomain', updateParams);
      this.logger.info('部署成功', JSON.stringify(res));
    }
  }

  async onGetCnameList(data: PageSearch) {
    if (!this.accessId) {
      throw new Error('请选择Access授权');
    }
    const access = await this.getAccess<AliyunAccess>(this.accessId);
    const client = await this.getWafClient(access);


    const pager = new Pager(data)

    const instanceId = await this.getInstanceId(client);
    const params:any = {
      RegionId: this.regionId,
      InstanceId: instanceId,
      PageSize: pager.pageSize,
      PageNumber: pager.pageNo,
    };
    if (data.searchKey){
      params.Domain = data.searchKey
    }

    const res = await client.request('DescribeDomains', params);
    if (!res?.Domains || res?.Domains.length === 0) {
      throw new Error('没有找到CNAME接入的域名站点');
    }
    const total = res.TotalCount;

    const options = res.Domains.map((item: any) => {
      return {
        label: item.Domain,
        value: item.Domain,
        title: item.Domain,
        domain: item.Domain,
      };
    });
    const list= this.ctx.utils.options.buildGroupOptions(options, this.certDomains);

    // const list = [{value:"1",label:"1"},{value:"2",label:"2"}]
    // const total = 120
    return {
      list,
      total: total,
      pageNo: pager.pageNo,
      pageSize: pager.pageSize
    };
  }
}

new AliyunDeployCertToWaf();
