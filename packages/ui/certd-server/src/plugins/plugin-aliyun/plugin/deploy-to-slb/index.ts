import {AbstractTaskPlugin, IsTaskPlugin, PageSearch, pluginGroups, RunStrategy, TaskInput} from '@certd/pipeline';
import {CertInfo} from '@certd/plugin-cert';
import {
  createCertDomainGetterInputDefine,
  createRemoteSelectInputDefine
} from '@certd/plugin-lib';
import {CertApplyPluginNames} from '@certd/plugin-cert';
import { AliyunAccess } from '../../../plugin-lib/aliyun/access/index.js';
import { AliyunClient, AliyunSslClient, CasCertInfo } from '../../../plugin-lib/aliyun/lib/index.js';

@IsTaskPlugin({
  name: 'AliyunDeployCertToSLB',
  title: '阿里云-部署至CLB(传统负载均衡)',
  icon: 'svg:icon-aliyun',
  group: pluginGroups.aliyun.key,
  desc: '部署证书到阿里云CLB(传统负载均衡)',
  needPlus: false,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class AliyunDeployCertToSLB extends AbstractTaskPlugin {
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

  @TaskInput(createCertDomainGetterInputDefine({props: {required: false}}))
  certDomains!: string[];


  @TaskInput({
    title: '证书接入点',
    helper: '不会选就保持默认即可',
    value: 'cas.aliyuncs.com',
    component: {
      name: 'a-select',
      options: [
        {value: 'cas.aliyuncs.com', label: '中国大陆'},
        {value: 'cas.ap-southeast-1.aliyuncs.com', label: '新加坡'},
        {value: 'cas.eu-central-1.aliyuncs.com', label: '德国（法兰克福）'},
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
      title: 'LB所在地区',
      multi: false,
      action: AliyunDeployCertToSLB.prototype.onGetRegionList.name,
      watches: ['accessId'],
    })
  )
  regionId: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: '负载均衡列表',
      helper: '要部署证书的负载均衡ID',
      action: AliyunDeployCertToSLB.prototype.onGetLoadBalanceList.name,
      watches: ['regionId'],
    })
  )
  loadBalancers!: string[];

  @TaskInput(
    createRemoteSelectInputDefine({
      title: '监听器列表',
      helper: '要部署证书的监听器列表',
      action: AliyunDeployCertToSLB.prototype.onGetListenerList.name,
      watches: ['loadBalancers'],
    })
  )
  listeners!: string[];


  @TaskInput({
      title: "部署默认证书",
      value: true,
      component: {
        name: "a-switch",
        vModel: "checked"
      }
    }
  )
  deployDefault!: boolean;

  @TaskInput({
      title: "部署扩展证书",
      value: false,
      component: {
        name: "a-switch",
        vModel: "checked"
      }
    }
  )
  deployExtension!: boolean;


  @TaskInput(
    createRemoteSelectInputDefine({
      title: '扩展域名列表',
      helper: '要部署扩展域名列表',
      action: AliyunDeployCertToSLB.prototype.onGetExtensionDomainList.name,
      watches: ['listeners','deployExtension'],
      mergeScript:`
        return {
        show: ctx.compute(({form})=>{
          return form.deployExtension;
        })
      }
      `
    })
  )
  extensionDomains!: string[];


  async onInstance() {
  }

  async getLBClient(access: AliyunAccess, region: string) {
    const client = new AliyunClient({logger: this.logger});
    const version = '2014-05-15';
    await client.init({
      accessKeyId: access.accessKeyId,
      accessKeySecret: access.accessKeySecret,
      //https://wafopenapi.cn-hangzhou.aliyuncs.com
      endpoint: `https://slb.${region}.aliyuncs.com`,
      apiVersion: version,
    });
    return client;
  }

  async execute(): Promise<void> {
    this.logger.info(`开始部署证书到阿里云(clb)`);
    const access = await this.getAccess<AliyunAccess>(this.accessId);

    const client = await this.getLBClient(access, this.regionId);
    const aliyunCert = await this.getAliyunCertId(access);
    const slbServerCertId = await this.uploadServerCert(client, aliyunCert);

    if (this.deployDefault!==false) {
      this.logger.info("部署监听器默认证书")
      for (const listener of this.listeners) {
        const {port, loadBalanceId} = this.resolveListenerKey(listener)
        const params = {
          RegionId: this.regionId,
          LoadBalancerId: loadBalanceId,
          ListenerPort: port,
          ServerCertificateId: slbServerCertId,
        };

        const res = await client.request('SetLoadBalancerHTTPSListenerAttribute', params);
        this.checkRet(res);
        this.logger.info(`部署${listener}监听器证书成功`, JSON.stringify(res));
      }
    }

    if (this.deployExtension) {
      this.logger.info("部署监听器扩展域名证书")

      const clientV2 = this.getCLBClientV2(access);
      for (const domainStr of this.extensionDomains) {
        const {extensionDomainId} = this.resolveListenerKey(domainStr)
        const res = await clientV2.doRequest({
          action: "SetDomainExtensionAttribute",
          // 接口版本
          version: "2014-05-15",
          data: {
            query: {
              RegionId: this.regionId,
              DomainExtensionId: extensionDomainId,
              ServerCertificateId: slbServerCertId
            }
          }
        })
        this.logger.info(`部署扩展域名${extensionDomainId}证书成功`, JSON.stringify(res))
      }
    }
    this.logger.info('执行完成');
  }

  getCLBClientV2(access: AliyunAccess) {
    return access.getClient(`slb.${this.regionId}.aliyuncs.com`)
  }

  resolveListenerKey(listener: string) {
    const arr = listener.split('_');
    const loadBalanceId = arr[0];
    const protocol = arr[1];
    const port = arr[2];
    let extensionDomainId = undefined;
    if (arr.length > 3) {
      extensionDomainId = arr[3];
    }

    return {
      loadBalanceId,
      port: parseInt(port),
      extensionDomainId: extensionDomainId,
      protocol: protocol
    }
  }

  async uploadServerCert(client: any, aliyunCert: CasCertInfo) {
    const params = {
      RegionId: this.regionId,
      AliCloudCertificateId: aliyunCert.certId,
      AliCloudCertificateName: aliyunCert.certName,
      AliCloudCertificateRegionId: aliyunCert.casRegion
    };

    const res = await client.request('UploadServerCertificate', params);
    this.checkRet(res);
    this.logger.info('SLBServerCertificate创建成功', res.ServerCertificateId);
    return res.ServerCertificateId;
  }

  async getAliyunCertId(access: AliyunAccess) {
    let certId: any = this.cert;

    const sslClient = new AliyunSslClient({
      access,
      logger: this.logger,
      endpoint: this.casEndpoint,
    });

    if (typeof this.cert === 'object') {
      const name = this.appendTimeSuffix('certd');
      const certIdRes = await sslClient.uploadCertificate({
        name: name,
        cert: this.cert,
      });
      certId = certIdRes.certId as any;
    }

    return await sslClient.getCertInfo(certId);
  }

  async onGetRegionList(data: any) {
    if (!this.accessId) {
      throw new Error('请选择Access授权');
    }
    const access = await this.getAccess<AliyunAccess>(this.accessId);
    const client = await this.getLBClient(access, 'cn-shanghai');

    const res = await client.request('DescribeRegions', {});
    this.checkRet(res);
    if (!res?.Regions?.Region || res?.Regions?.Region.length === 0) {
      throw new Error('没有找到Regions列表');
    }

    return res.Regions.Region.map((item: any) => {
      return {
        label: item.LocalName,
        value: item.RegionId,
        endpoint: item.RegionEndpoint,
      };
    });
  }

  async onGetLoadBalanceList(data: any) {
    if (!this.accessId) {
      throw new Error('请先选择Access授权');
    }
    if (!this.regionId) {
      throw new Error('请先选择地区');
    }
    const access = await this.getAccess<AliyunAccess>(this.accessId);
    const client = await this.getLBClient(access, this.regionId);

    const params = {
      RegionId: this.regionId,
      MaxResults: 100,
    };
    const res = await client.request('DescribeLoadBalancers', params);
    this.checkRet(res);
    if (!res?.LoadBalancers?.LoadBalancer || res?.LoadBalancers.LoadBalancer.length === 0) {
      throw new Error('没有找到LoadBalancers');
    }

    return res.LoadBalancers.LoadBalancer.map((item: any) => {
      const label = `${item.LoadBalancerId}<${item.LoadBalancerName}}>`;
      return {
        label: label,
        value: item.LoadBalancerId,
      };
    });
  }

  async onGetListenerList(data: any) {
    if (!this.accessId) {
      throw new Error('请先选择Access授权');
    }
    if (!this.regionId) {
      throw new Error('请先选择地区');
    }
    const access = await this.getAccess<AliyunAccess>(this.accessId);
    const client = await this.getLBClient(access, this.regionId);

    const params: any = {
      MaxResults: 100,
      RegionId: this.regionId,
      ListenerProtocol: 'HTTPS',
    };
    if (this.loadBalancers && this.loadBalancers.length > 0) {
      params.LoadBalancerId = this.loadBalancers;
    }
    const res = await client.request('DescribeLoadBalancerListeners', params);
    this.checkRet(res);
    if (!res?.Listeners || res?.Listeners.length === 0) {
      throw new Error('没有找到HTTPS监听器');
    }

    return res.Listeners.map((item: any) => {
      const value = `${item.LoadBalancerId}_${item.ListenerProtocol}_${item.ListenerPort}`;
      const label = `${value}<${item.Description}>`;
      return {
        label: label,
        value: value,
      };
    });
  }

  async onGetExtensionDomainList(data: PageSearch) {
    if (!this.accessId) {
      throw new Error('请先选择Access授权');
    }
    if (!this.regionId) {
      throw new Error('请先选择地区');
    }
    if (!this.listeners && this.listeners.length == 0) {
      throw new Error('请先选择监听器');
    }
    const access = await this.getAccess<AliyunAccess>(this.accessId);

    const allDomains: any[] = []
    for (const ls of this.listeners) {
      const {port, loadBalanceId, protocol} = this.resolveListenerKey(ls)
      const domains = await this.doGetExtensionDomainList({
        access,
        loadBalancerId: loadBalanceId,
        listenerPort: port,
        listenerProtocol: protocol,
      });
      allDomains.push(...domains)
    }

    return this.ctx.utils.options.buildGroupOptions(allDomains, this.certDomains)

  }


  async doGetExtensionDomainList(data: {
    loadBalancerId: string,
    listenerPort: number,
    listenerProtocol: string,
    access: AliyunAccess
  }) {
    const {loadBalancerId, listenerPort, listenerProtocol, access} = data;
    const client = access.getClient(`slb.${this.regionId}.aliyuncs.com`)

    let queries = {
      RegionId: this.regionId,
      LoadBalancerId: loadBalancerId,
      ListenerPort: listenerPort
    };

    const res = await client.doRequest({
      // 接口名称
      action: "DescribeDomainExtensions",
      // 接口版本
      version: "2014-05-15",
      data: {
        query: queries,
      }
    })

    this.checkRet(res);
    const list = res?.DomainExtensions.DomainExtension;
    if (!list || list.length === 0) {
      return []
    }

    return list.map((i: any) => {
      const value = `${loadBalancerId}_${listenerProtocol ?? "HTTPS"}_${listenerPort}_${i.DomainExtensionId}`;
      const label = `${i.DomainExtensionId}<${i.Domain}>`;
      return {
        value: value,
        label: label,
        domain:i.Domain
      };
    });
  }


  checkRet(ret: any) {
    if (ret.Code != null) {
      throw new Error(ret.Message);
    }
  }
}

new AliyunDeployCertToSLB();
