import {AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput} from '@certd/pipeline';
import {
  createCertDomainGetterInputDefine,
  createRemoteSelectInputDefine
} from "@certd/plugin-lib";
import { AliyunAccess } from "../../../plugin-lib/aliyun/access/index.js";
import { AliyunSslClient } from "../../../plugin-lib/aliyun/lib/ssl-client.js";
import { CertApplyPluginNames, CertInfo, CertReader } from "@certd/plugin-cert";
import {optionsUtils} from "@certd/basic";

@IsTaskPlugin({
  name: 'DeployCertToAliyunApig',
  title: '阿里云-部署至云原生API网关/AI网关',
  icon: 'svg:icon-aliyun',
  group: pluginGroups.aliyun.key,
  desc: '自动部署域名证书至云原生API网关、AI网关',
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class DeployCertToAliyunApig extends AbstractTaskPlugin {
  @TaskInput({
    title: '域名证书',
    helper: '请选择前置任务输出的域名证书',
    component: {
      name: 'output-selector',
      from: [...CertApplyPluginNames, 'uploadCertToAliyun'],
    },
    required: true,
  })
  cert!: CertInfo | string;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];



  @TaskInput({
    title: 'Access授权',
    helper: '阿里云授权',
    component: {
      name: 'access-selector',
      type: 'aliyun',
    },
    required: true,
  })
  accessId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: '区域',
      helper: '请选择区域',
      action: DeployCertToAliyunApig.prototype.onGetRegionList.name,
      watches: ['certDomains', 'accessId'],
      required: true,
      component:{
        name:"remote-auto-complete"
      }
    })
  )
  regionEndpoint!: string;


  @TaskInput({
    title: "网关类型",
    component: {
      name: "a-select",
      vModel:"value",
      options:[
        {value:"AI",label:"AI"},
        {value:"API",label:"API"},
      ]
    },
    required: true //必填
  })
  gatewayType!: string;


  @TaskInput(
    createRemoteSelectInputDefine({
      title: '绑定域名',
      helper: '请选择域名',
      action: DeployCertToAliyunApig.prototype.onGetDomainList.name,
      watches: ['region',  'accessId','gatewayType'],
      required: true,
    })
  )
  domainList!: string[];


  @TaskInput({
    title: "强制HTTPS",
    component: {
      name: "a-select",
      vModel:"value",
      options:[
        {value:true,label:"强制HTTPS"},
        {value:false,label:"不强制HTTPS"},
      ]
    },
    required: true //必填
  })
  forceHttps!: boolean;

  @TaskInput({
    title: '证书服务接入点',
    helper: '不会选就按默认',
    value: 'cn-hangzhou',
    component: {
      name: 'a-select',
      options: [
        { value: 'cn-hangzhou', label: '中国大陆' },
        { value: 'ap-southeast-1', label: '新加坡' },
      ],
    },
    required: true,
  })
  casRegion!: string;


  async onInstance() {}
  async execute(): Promise<void> {
    this.logger.info('开始部署证书到云原生Api网关');
    if(!this.domainList){
      throw new Error('您还未选择域名');
    }
    const access = await this.getAccess<AliyunAccess>(this.accessId);
    const client = access.getClient(this.regionEndpoint)


    let certId: any = this.cert;
    if (typeof this.cert === 'object') {
      const sslClient = new AliyunSslClient({
        access,
        logger: this.logger,
        region: this.casRegion,
      });

      certId = await sslClient.uploadCert({
        name: this.buildCertName(CertReader.getMainDomain(this.cert.crt)),
        cert: this.cert,
      });
    }

    const certIdentify  = `${certId}-${this.casRegion}`

    for (const domainId of this.domainList ) {
      this.logger.info(`[${domainId}]开始部署`)
      await this.updateCert(client, domainId,certIdentify);
      this.logger.info(`[${domainId}]部署成功`)
    }

    this.logger.info('部署完成');
  }


  async updateCert(client: any, domainId: string,certIdentify:string) {

    const domainInfoRes = await client.doRequest({
      action: "GetDomain",
      version: "2024-03-27",
      protocol: "HTTPS",
      method: "GET",
      authType: "AK",
      style: "ROA",
      pathname: `/v1/domains/${domainId}`,
    });

    const tlsCipherSuitesConfig = domainInfoRes.data?.tlsCipherSuitesConfig


   const ret = await client.doRequest({
     action: "UpdateDomain",
     version: "2024-03-27",
     method: "PUT",
     style: "ROA",
     pathname: `/v1/domains/${domainId}`,
      data:{
        body:{
          certIdentifier: certIdentify,
          protocol: "HTTPS",
          forceHttps:this.forceHttps,
          tlsCipherSuitesConfig
        }
      }
    })
    this.logger.info(`设置${domainId}证书成功:`, ret.requestId);
  }

  async onGetDomainList(data: any) {
    if (!this.accessId) {
      throw new Error('请选择Access授权');
    }
    if (!this.regionEndpoint) {
      throw new Error('请选择区域');
    }
    if (!this.gatewayType) {
      throw new Error('请选择网关类型');
    }
    const access = await this.getAccess<AliyunAccess>(this.accessId);

    const client = access.getClient(this.regionEndpoint)

      const res =await client.doRequest({
        action: "ListDomains",
        version: "2024-03-27",
        method: "GET",
        style: "ROA",
        pathname: `/v1/domains`,
        data:{
          query:{
            pageSize: 100,
            gatewayType: this.gatewayType ,
          }
        }
      })
    const list = res?.data?.items;
    if (!list || list.length === 0) {
      return []
    }
    const options = list.map((item: any) => {
      return {
        value: item.domainId,
        label: `${item.name}<${item.domainId}>`,
        domain: item.name,
      };
    });
    return optionsUtils.buildGroupOptions(options, this.certDomains);
  }


  async onGetRegionList(data: any) {
    const list = [
      {value:"cn-qingdao",label:"华北1（青岛）",endpoint:"apig.cn-qingdao.aliyuncs.com"},
      {value:"cn-beijing",label:"华北2（北京）",endpoint:"apig.cn-beijing.aliyuncs.com"},
      {value:"cn-zhangjiakou",label:"华北3（张家口）",endpoint:"apig.cn-zhangjiakou.aliyuncs.com"},
      {value:"cn-wulanchabu",label:"华北6（乌兰察布）",endpoint:"apig.cn-wulanchabu.aliyuncs.com"},
      {value:"cn-hangzhou",label:"华东1（杭州）",endpoint:"apig.cn-hangzhou.aliyuncs.com"},
      {value:"cn-shanghai",label:"华东2（上海）",endpoint:"apig.cn-shanghai.aliyuncs.com"},
      {value:"cn-shenzhen",label:"华南1（深圳）",endpoint:"apig.cn-shenzhen.aliyuncs.com"},
      {value:"cn-heyuan",label:"华南2（河源）",endpoint:"apig.cn-heyuan.aliyuncs.com"},
      {value:"cn-guangzhou",label:"华南3（广州）",endpoint:"apig.cn-guangzhou.aliyuncs.com"},
      {value:"ap-southeast-2",label:"澳大利亚（悉尼）已关停",endpoint:"apig.ap-southeast-2.aliyuncs.com"},
      {value:"ap-southeast-6",label:"菲律宾（马尼拉）",endpoint:"apig.ap-southeast-6.aliyuncs.com"},
      {value:"ap-northeast-2",label:"韩国（首尔）",endpoint:"apig.ap-northeast-2.aliyuncs.com"},
      {value:"ap-southeast-3",label:"马来西亚（吉隆坡）",endpoint:"apig.ap-southeast-3.aliyuncs.com"},
      {value:"ap-northeast-1",label:"日本（东京）",endpoint:"apig.ap-northeast-1.aliyuncs.com"},
      {value:"ap-southeast-7",label:"泰国（曼谷）",endpoint:"apig.ap-southeast-7.aliyuncs.com"},
      {value:"cn-chengdu",label:"西南1（成都）",endpoint:"apig.cn-chengdu.aliyuncs.com"},
      {value:"ap-southeast-1",label:"新加坡",endpoint:"apig.ap-southeast-1.aliyuncs.com"},
      {value:"ap-southeast-5",label:"印度尼西亚（雅加达）",endpoint:"apig.ap-southeast-5.aliyuncs.com"},
      {value:"cn-hongkong",label:"中国香港",endpoint:"apig.cn-hongkong.aliyuncs.com"},
      {value:"eu-central-1",label:"德国（法兰克福）",endpoint:"apig.eu-central-1.aliyuncs.com"},
      {value:"us-east-1",label:"美国（弗吉尼亚）",endpoint:"apig.us-east-1.aliyuncs.com"},
      {value:"us-west-1",label:"美国（硅谷）",endpoint:"apig.us-west-1.aliyuncs.com"},
      {value:"eu-west-1",label:"英国（伦敦）",endpoint:"apig.eu-west-1.aliyuncs.com"},
      {value:"me-east-1",label:"阿联酋（迪拜）",endpoint:"apig.me-east-1.aliyuncs.com"},
      {value:"me-central-1",label:"沙特（利雅得）",endpoint:"apig.me-central-1.aliyuncs.com"},
    ]
    return list.map((item: any) => {
      return {
        value: item.endpoint,
        label: item.label,
        endpoint: item.endpoint,
        regionId : item.value
      };
    })
  }
}
new DeployCertToAliyunApig();
