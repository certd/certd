import {AbstractTaskPlugin, IsTaskPlugin, Pager, pluginGroups, RunStrategy, TaskInput} from '@certd/pipeline';
import {
  createCertDomainGetterInputDefine,
  createRemoteSelectInputDefine
} from '@certd/plugin-lib';
import {CertInfo, CertReader} from '@certd/plugin-cert';
import { CertApplyPluginNames} from '@certd/plugin-cert';
import {optionsUtils} from "@certd/basic";
import {isArray} from "lodash-es";
import { AliyunAccess } from '../../../plugin-lib/aliyun/access/index.js';
import { AliyunSslClient } from '../../../plugin-lib/aliyun/lib/index.js';
@IsTaskPlugin({
  name: 'DeployCertToAliyunOSS',
  title: '阿里云-部署证书至OSS',
  icon: 'svg:icon-aliyun',
  group: pluginGroups.aliyun.key,
  desc: '部署域名证书至阿里云OSS自定义域名，不是上传到阿里云oss',
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class DeployCertToAliyunOSS extends AbstractTaskPlugin {

  @TaskInput({
    title: '域名证书',
    helper: '请选择前置任务输出的域名证书',
    component: {
      name: 'output-selector',
      from: [...CertApplyPluginNames,"uploadCertToAliyun"],
    },
    required: true,
  })
  cert!: CertInfo | string;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];


  @TaskInput({
    title: '大区',
    component: {
      name: 'a-auto-complete',
      vModel: 'value',
      options: [
        { value: 'oss-cn-hangzhou', label: '华东1（杭州）' },
        { value: 'oss-cn-shanghai', label: '华东2（上海）' },
        { value: 'oss-cn-nanjing', label: '华东5（南京-本地地域）' },
        { value: 'oss-cn-fuzhou', label: '华东6（福州-本地地域）' },
        { value: 'oss-cn-wuhan-lr', label: '华中1（武汉-本地地域）' },
        { value: 'oss-cn-qingdao', label: '华北1（青岛）' },
        { value: 'oss-cn-beijing', label: '华北2（北京）' },
        { value: 'oss-cn-zhangjiakou', label: '华北 3（张家口）' },
        { value: 'oss-cn-huhehaote', label: '华北5（呼和浩特）' },
        { value: 'oss-cn-wulanchabu', label: '华北6（乌兰察布）' },
        { value: 'oss-cn-shenzhen', label: '华南1（深圳）' },
        { value: 'oss-cn-heyuan', label: '华南2（河源）' },
        { value: 'oss-cn-guangzhou', label: '华南3（广州）' },
        { value: 'oss-cn-chengdu', label: '西南1（成都）' },
        { value: 'oss-cn-hongkong', label: '中国香港' },
        { value: 'oss-us-west-1', label: '美国（硅谷）①' },
        { value: 'oss-us-east-1', label: '美国（弗吉尼亚）①' },
        { value: 'oss-ap-northeast-1', label: '日本（东京）①' },
        { value: 'oss-ap-northeast-2', label: '韩国（首尔）' },
        { value: 'oss-ap-southeast-1', label: '新加坡①' },
        { value: 'oss-ap-southeast-2', label: '澳大利亚（悉尼）①' },
        { value: 'oss-ap-southeast-3', label: '马来西亚（吉隆坡）①' },
        { value: 'oss-ap-southeast-5', label: '印度尼西亚（雅加达）①' },
        { value: 'oss-ap-southeast-6', label: '菲律宾（马尼拉）' },
        { value: 'oss-ap-southeast-7', label: '泰国（曼谷）' },
        { value: 'oss-eu-central-1', label: '德国（法兰克福）①' },
        { value: 'oss-eu-west-1', label: '英国（伦敦）' },
        { value: 'oss-me-east-1', label: '阿联酋（迪拜）①' },
        { value: 'oss-rg-china-mainland', label: '无地域属性（中国内地）' },
      ],
    },
    required: true,
  })
  region!: string;

  @TaskInput({
    title: 'Bucket',
    helper: '存储桶名称',
    component: {
      name: 'remote-auto-complete',
      vModel: 'value',
      type: 'plugin',
      action: 'onGetBucketList',
      search: false,
      pager: false,
      watches: ['accessId', 'region']
    },
    required: true,
  })
  bucket!: string;

  @TaskInput(createRemoteSelectInputDefine({
    title: '绑定的域名',
    helper: '你在阿里云OSS上绑定的域名，比如:certd.docmirror.cn',
    required: true,
    action: DeployCertToAliyunOSS.prototype.onGetDomainList.name,
    watches: ['certDomains', 'accessId','bucket'],
  }))
  domainName!: string | string[];


  @TaskInput({
    title: '证书名称',
    helper: '上传后将以此名称作为前缀备注',
  })
  certName!: string;



  @TaskInput({
    title: '证书服务接入点',
    helper: '不会选就按默认',
    value: 'cn-hangzhou',
    component: {
      name: 'a-select',
      options: [
        { value: 'cn-hangzhou', label: '中国大陆' },
        { value: 'ap-southeast-1', label: '新加坡' },
        { value: 'eu-central-1', label: '德国（法兰克福）' },
      ],
    },
    required: true,
    order: -99,
  })
  casRegion!: string;

  @TaskInput({
    title: 'Access授权',
    helper: '阿里云授权AccessKeyId、AccessKeySecret',
    component: {
      name: 'access-selector',
      type: 'aliyun',
    },
    required: true,
    order: -98,
  })
  accessId!: string;

  async onInstance() {}
  async execute(): Promise<void> {
    this.logger.info('开始部署证书到阿里云OSS');
    const access = (await this.getAccess(this.accessId)) as AliyunAccess;

    await this.getAliyunCertId(access)
    this.logger.info(`bucket: ${this.bucket}, region: ${this.region}, domainName: ${this.domainName}`);
    const client = await this.getClient(access);
    if (typeof this.domainName === "string"){
      this.domainName = [this.domainName];
    }
    for (const domainName of this.domainName) {
      this.logger.info("开始部署证书到阿里云oss自定义域名:", domainName)
      await this.updateCert(domainName,client, {});
    }

    this.logger.info('部署完成');
  }


  async updateCert(domainName:string,client: any, params: any) {
    params = client._bucketRequestParams('POST', this.bucket, {
      cname: '',
      comp: 'add',
    });

    let certStr =  ""
    if (typeof this.cert === "object" ){
      certStr = `
      <PrivateKey>${this.cert.key}</PrivateKey>
      <Certificate>${this.cert.crt}</Certificate>
`
    }else{
      certStr = `<CertId>${this.cert}-${this.casRegion}</CertId>`
    }

    const xml = `
 <BucketCnameConfiguration>
  <Cname>
    <Domain>${domainName}</Domain>
    <CertificateConfiguration>
      ${certStr}
      <Force>true</Force>
    </CertificateConfiguration>
  </Cname>
</BucketCnameConfiguration>`;
    params.content = xml;
    params.mime = 'xml';
    params.successStatuses = [200];
    const res = await client.request(params);
    this.checkRet(res);
    return res;
  }

  async getAliyunCertId(access: AliyunAccess) {
    let certId: any = this.cert;
    let certName: any = this.appendTimeSuffix("certd");
    if (typeof this.cert === "object") {
      let endpoint = `cas.${this.casRegion}.aliyuncs.com`;
      if (this.casRegion === "cn-hangzhou" || !this.casRegion){
        endpoint = "cas.aliyuncs.com";
      }
      const sslClient = new AliyunSslClient({
        access,
        logger: this.logger,
        endpoint: endpoint
      });

      certName = this.buildCertName(CertReader.getMainDomain(this.cert.crt));

      const certIdRes = await sslClient.uploadCertificate({
        name: certName,
        cert: this.cert
      });
      certId = certIdRes.certId as any;
      this.logger.info("上传证书成功", certId, certName);
    }
    return {
      certId,
      certName
    };
  }

  async getClient(access: AliyunAccess) {
    // @ts-ignore
    const OSS = await import('ali-oss');
    return new OSS.default({
      accessKeyId: access.accessKeyId,
      accessKeySecret: access.accessKeySecret,
      // yourRegion填写Bucket所在地域。以华东1（杭州）为例，Region填写为oss-cn-hangzhou。
      region: this.region,
      //@ts-ignore
      authorizationV4: true,
      // yourBucketName填写Bucket名称。
      bucket: this.bucket,
    });
  }

  async onGetBucketList(data: Pager) {

    const access = (await this.getAccess(this.accessId)) as AliyunAccess;
    const client = await this.getClient(access);

    let res;
    const buckets = []
    do{
      const requestData = {'marker': res?.nextMarker || null, 'max-keys': 1000};
      res = await client.listBuckets(requestData)
      buckets.push(...(res?.buckets || []))
    } while (!!res?.nextMarker)
    return buckets
      .filter(bucket => bucket?.region === this.region)
      .map(bucket => ({label: `${bucket.name}<${bucket.region}>`, value: bucket.name}));
  }

  async onGetDomainList(data: any) {

    const access = (await this.getAccess(this.accessId)) as AliyunAccess;
    const client = await this.getClient(access);

    const res  = await this.doListCnameRequest(client,this.bucket)
    let domains = res.data?.Cname
    if (domains == null || domains.length === 0){
      return []
    }
    if (!isArray(domains)){
      domains = [domains]
    }

    const options = domains.map((item: any) => {
      return {
        value: item.Domain,
        label: item.Domain,
        domain: item.Domain,
      };
    });
    return optionsUtils.buildGroupOptions(options, this.certDomains);
  }


  async doListCnameRequest(client: any,bucket:string) {
    const params = client._bucketRequestParams('GET', this.bucket, {
      cname: '',
      bucket
    });
    params.mime = 'xml';
    params.successStatuses = [200];
    params.xmlResponse = true;
    const res = await client.request(params);
    this.checkRet(res);
    return res;
  }



  checkRet(ret: any) {
    if (ret.Code != null || ret.status!==200) {
      throw new Error('执行失败：' + ret.Message || ret.data);
    }
  }
}
new DeployCertToAliyunOSS();
