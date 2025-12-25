import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { HuaweiAccess } from "../../access/index.js";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";

@IsTaskPlugin({
  name: 'HauweiDeployCertToOBS',
  title: '华为云-部署证书至OBS',
  icon: 'svg:icon-huawei',
  group: pluginGroups.huawei.key,
  desc: '',
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class HauweiDeployCertToOBS extends AbstractTaskPlugin {
  @TaskInput({
    title: '域名证书',
    helper: '请选择前置任务输出的域名证书\n如果你选择使用ccm证书ID，则需要在[域名管理页面右上角开启SCM授权](https://console.huaweicloud.com/cdn/#/cdn/domain)',
    component: {
      name: 'output-selector',
      from: [...CertApplyPluginNames,'HauweiUploadToCCM'],
    },
    required: true,
  })
  cert!: CertInfo | string;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  @TaskInput({
    title: 'Access授权',
    helper: '华为云授权AccessKeyId、AccessKeySecret',
    component: {
      name: 'access-selector',
      type: 'huawei',
    },
    required: true,
  })
  accessId!: string;


  @TaskInput(
    createRemoteSelectInputDefine({
      title: '存储桶',
      helper: '请选择存储桶',
      action: HauweiDeployCertToOBS.prototype.onGetBucketList.name,
    })
  )
  bucketList!: string[];

  @TaskInput(
    createRemoteSelectInputDefine({
      title: '自定义域名',
      helper: '请选择自定义域名',
      action: HauweiDeployCertToOBS.prototype.onGetDomainList.name,
      watches: ['bucketList'],
    })
  )
  domainList!: string[];



  async execute(): Promise<void> {
    if (!this.cert) {
      throw new Error('域名证书不能为空');
    }
    this.logger.info('开始部署证书到华为云obs');

    for (const domainStr of this.domainList) {
      const [location, bucket,domain] = domainStr.split('_');

      await this.setDomainCert({
        location,
        bucket,
        domain,
        cert: this.cert
      });
    }

    this.logger.info('部署证书到华为云cdn完成');
  }

  checkRet(ret: any){
    if (ret?.CommonMsg?.Status>300){

      throw new Error(`【${ret?.CommonMsg?.Code}】${ret?.CommonMsg?.Message}`);
    }
  }


  async getObsClient(opts:{region?:string,bucket?:string} = {}) {
    const { region,bucket } = opts;
    const regionStr = region? `${region}.`: 'cn-north-4.';
    const bucketStr = bucket? `${bucket}.` : '';
    const access = await this.getAccess<HuaweiAccess>(this.accessId);
    const sdk = await import('esdk-obs-nodejs');
    const obsClient = new sdk.default({
      // 推荐通过环境变量获取AKSK，这里也可以使用其他外部引入方式传入，如果使用硬编码可能会存在泄露风险
      // 您可以登录访问管理控制台获取访问密钥AK/SK，获取方式请参见https://support.huaweicloud.com/usermanual-ca/ca_01_0003.html
      access_key_id: access.accessKeyId,
      secret_access_key: access.accessKeySecret,
      // 【可选】如果使用临时AK/SK和SecurityToken访问OBS，同样建议您尽量避免使用硬编码，以降低信息泄露风险。您可以通过环境变量获取访问密钥AK/SK，也可以使用其他外部引入方式传入
      // security_token: process.env.SECURITY_TOKEN,
      // endpoint填写Bucket对应的Endpoint, 这里以华北-北京四为例，其他地区请按实际情况填写
      server: `https://${bucketStr}obs.${regionStr}myhuaweicloud.com`,
    });
    return obsClient
  }

  async onGetBucketList(data: any) {
    const obsClient = await this.getObsClient();
    const res = await obsClient.listBuckets({
      QueryLocation:true
    })

    this.checkRet(res)

    const list = res.InterfaceResult?.Buckets

    if (!list || list.length === 0) {
      return []
    }

    return list.map(item => {
      return {
        value: `${item.Location}_${item.BucketName}`,
        label:  `${item.BucketName}<${item.Location}>`,
      };
    });
  }

  async onGetDomainList(data:any) {
    if (!this.bucketList || this.bucketList.length === 0) {
      return []
    }
    const optionList = []
    for (const item of this.bucketList) {
      const [location,bucket] = item.split('_')

      const obsClient = await this.getObsClient({region:location});
      const res = await obsClient.getBucketCustomDomain({
        Bucket: bucket,
      })
      this.checkRet(res)

      const list = res.InterfaceResult?.Domains

      if (!list || list.length === 0) {
        continue
      }
      const options= list.map(item => {
        return {
          value: `${location}_${bucket}_${item.DomainName}`,
          label:  `${item.DomainName}<${bucket}_${location}>`,
          domain: item.DomainName,
        };
      });
      optionList.push(...options)
    }

    return this.ctx.utils.options.buildGroupOptions( optionList,this.certDomains)
  }

  async setDomainCert(opts:{location:string,bucket:string,domain:string,cert:string|CertInfo}){
    const {location,bucket,domain,cert} = opts
    const obsClient = await this.getObsClient({region:location});
    const params:any = {
      Bucket: bucket,
      DomainName: domain,
      DomainBody:{
        Name: this.buildCertName( domain),  
      }
    };
    if (typeof cert === 'string'){
      params.DomainBody.CertificateId= cert
    }else{
      params.DomainBody.Certificate= cert.crt
      params.DomainBody.PrivateKey = cert.key
    }
    const res = await obsClient.setBucketCustomDomain(params)
    this.checkRet(res)
  }
}
new HauweiDeployCertToOBS();
