import { AbstractTaskPlugin, IsTaskPlugin, PageSearch, pluginGroups, RunStrategy, TaskInput } from '@certd/pipeline';
import dayjs from 'dayjs';
import {
  createCertDomainGetterInputDefine,
  createRemoteSelectInputDefine
} from "@certd/plugin-lib";
import { AliyunAccess } from "../../../plugin-lib/aliyun/access/index.js";

import { CertInfo } from '@certd/plugin-cert';
import { CertApplyPluginNames } from '@certd/plugin-cert';
import { optionsUtils } from "@certd/basic";
import { AliyunClient, CasCertId } from "../../../plugin-lib/aliyun/lib/index.js";
@IsTaskPlugin({
  name: 'DeployCertToAliyunDCDN',
  title: '阿里云-部署证书至DCDN',
  icon: 'svg:icon-aliyun',
  group: pluginGroups.aliyun.key,
  desc: '依赖证书申请前置任务，自动部署域名证书至阿里云DCDN',
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class DeployCertToAliyunDCDN extends AbstractTaskPlugin {
  @TaskInput({
    title: '域名证书',
    helper: '请选择前置任务输出的域名证书',
    component: {
      name: 'output-selector',
      from: [...CertApplyPluginNames, 'uploadCertToAliyun'],
    },
    required: true,
  })
  cert!: CertInfo | CasCertId | number;

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
    title: '证书名称',
    helper: '上传后将以此名称作为前缀备注',
  })
  certName!: string;

  @TaskInput({
    title: '域名匹配模式',
    helper: '选择域名匹配方式',
    component: {
      name: 'select',
      options: [
        { label: '手动选择', value: 'manual' },
        { label: '根据证书匹配', value: 'auto' },
      ],
    },
    default: 'manual',
  })
  domainMatchMode!: 'manual' | 'auto';

  @TaskInput(
    createRemoteSelectInputDefine({
      title: 'DCDN加速域名',
      helper: '你在阿里云上配置的DCDN加速域名，比如:certd.docmirror.cn',
      action: DeployCertToAliyunDCDN.prototype.onGetDomainList.name,
      watches: ['certDomains', 'accessId'],
      required: true,
      mergeScript: `
        return {
          show: ctx.compute(({form})=>{
            return domainMatchMode === "manual"
          })
        }
      `,
    })
  )
  domainName!: string | string[];


  async onInstance() { }
  async execute(): Promise<void> {
    this.logger.info('开始部署证书到阿里云DCDN');
    const access = (await this.getAccess(this.accessId)) as AliyunAccess;
    const client = await this.getClient(access);
    
    let domains: string[] = [];
    
    if (this.domainMatchMode === 'auto') {
      this.logger.info('使用根据证书匹配模式');
      if (!this.certDomains || this.certDomains.length === 0) {
        throw new Error('未获取到证书域名信息');
      }
      domains = await this.getAutoMatchedDomains(this.certDomains);
      if (domains.length === 0) {
        this.logger.warn('未找到匹配的DCDN域名');
        return;
      }
      this.logger.info(`找到 ${domains.length} 个匹配的DCDN域名`);
    } else {
      if (!this.domainName) {
        throw new Error('您还未选择DCDN域名');
      }
      domains = typeof this.domainName === 'string' ? [this.domainName] : this.domainName;
    }
    
    for (const domainName of domains) {
      this.logger.info(`[${domainName}]开始部署`)
      const params = await this.buildParams(domainName);
      await this.doRequest(client, params);
      await this.ctx.utils.sleep(1000);
      this.logger.info(`[${domainName}]部署成功`)
    }

    this.logger.info('部署完成');
  }

  async getClient(access: AliyunAccess) {
    const client = new AliyunClient({ logger: this.logger });
    await client.init({
      accessKeyId: access.accessKeyId,
      accessKeySecret: access.accessKeySecret,
      endpoint: 'https://dcdn.aliyuncs.com',
      apiVersion: '2018-01-15',
    });
    return client;
  }

  async buildParams(domainName: string) {
    const CertName = (this.certName ?? 'certd') + '-' + dayjs().format('YYYYMMDDHHmmss');

    let certId: any = this.cert
    if (typeof this.cert === 'object') {
      const certInfo = this.cert as CertInfo;
      const casCertId = this.cert as CasCertId;
      if (certInfo.crt) {
        this.logger.info('上传证书:', CertName);
        const cert: any = this.cert;
        return {
          DomainName: domainName,
          SSLProtocol: 'on',
          CertName: CertName,
          CertType: 'upload',
          SSLPub: cert.crt,
          SSLPri: cert.key,
        };
      }else if (casCertId.certId){
        certId = casCertId.certId;
      }else{
        throw new Error('证书格式错误'+JSON.stringify(this.cert));
      }
    }
    this.logger.info('使用已上传的证书:', certId);
    return {
      DomainName: domainName,
      SSLProtocol: 'on',
      CertType: 'cas',
      CertName: CertName,
      CertId: certId,
    };
  }

  async doRequest(client: any, params: any) {
    const requestOption = {
      method: 'POST',
      formatParams: false,
    };
    const ret: any = await client.request('SetDcdnDomainSSLCertificate', params, requestOption);
    this.checkRet(ret);
    this.logger.info('设置Dcdn证书成功:', ret.RequestId);
  }

  checkRet(ret: any) {
    if (ret.Code != null) {
      throw new Error('执行失败：' + ret.Message);
    }
  }


  async getAutoMatchedDomains(certDomains: string[]): Promise<string[]> {
    const matchedDomains: string[] = [];
    let pageNumber = 1;
    
    while (true) {
      const result = await this.onGetDomainList({ pageNo: pageNumber });
      const pageData = result.list;
      this.logger.info(`获取到 ${pageData.length} 个DCDN域名`);
      
      if (!pageData || pageData.length === 0) {
        break;
      }
      
      const matched = this.getMatchedDomains(pageData, certDomains);
      matchedDomains.push(...matched);
      
      const totalCount = result.total || 0;
      if (pageNumber * 500 >= totalCount) {
        break;
      }
      
      pageNumber++;
    }
    
    return matchedDomains;
  }



  async onGetDomainList(data: PageSearch) {
    if (!this.accessId) {
      throw new Error('请选择Access授权');
    }
    const access = await this.getAccess<AliyunAccess>(this.accessId);

    const client = await this.getClient(access);

    const params = {
      PageNumber: data.pageNo || 1,
      PageSize: 500,
    };

    const requestOption = {
      method: 'POST',
      formatParams: false,
    };

    const res = await client.request('DescribeDcdnUserDomains', params, requestOption);
    this.checkRet(res);
    const pageData = res?.Domains?.PageData || [];
    const total = res?.Domains?.TotalCount || 0;
    
    const options = pageData.map((item: any) => {
      return {
        value: item.DomainName,
        label: item.DomainName,
        domain: item.DomainName,
      };
    });
    
    return {
      list: optionsUtils.buildGroupOptions(options, this.certDomains),
      total: total,
    };
  }
}
new DeployCertToAliyunDCDN();
