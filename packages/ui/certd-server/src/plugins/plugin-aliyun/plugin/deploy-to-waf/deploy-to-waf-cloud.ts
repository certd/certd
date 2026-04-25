import { AbstractTaskPlugin, IsTaskPlugin, Pager, PageSearch, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo, CertReader } from "@certd/plugin-cert";
import {
  createCertDomainGetterInputDefine,
  createRemoteSelectInputDefine
} from "@certd/plugin-lib";
import { AliyunAccess } from "../../../plugin-lib/aliyun/access/index.js";
import { AliyunClient, AliyunSslClient, CasCertInfo } from "../../../plugin-lib/aliyun/lib/index.js";

@IsTaskPlugin({
  name: 'AliyunDeployCertToWafCloud',
  title: '阿里云-部署至阿里云WAF(云产品接入)',
  icon: 'svg:icon-aliyun',
  group: pluginGroups.aliyun.key,
  desc: '部署证书到阿里云WAF(云产品接入)，CNAME方式接入的请选择另外一个waf插件',
  needPlus: false,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class AliyunDeployCertToWafCloud extends AbstractTaskPlugin {
  @TaskInput({
    title: '域名证书',
    helper: '请选择证书申请任务输出的域名证书\n或者选择前置任务“上传证书到阿里云”任务的证书ID，可以减少上传到阿里云的证书数量',
    component: {
      name: 'output-selector',
      from: [...CertApplyPluginNames, 'uploadCertToAliyun'],
    },
    required: true,
  })
  cert!: CertInfo | number | CasCertInfo;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  @TaskInput({
    title: 'WAF接入点',
    helper: '不会选就按默认',
    value: 'cn-hangzhou',
    component: {
      name: 'a-select',
      options: [
        { value: 'cn-hangzhou', label: '中国内地' },
        { value: 'ap-southeast-1', label: '非中国内地' },
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
      title: '云产品资源',
      helper: '请选择要部署证书的云产品资源',
      action: AliyunDeployCertToWafCloud.prototype.onGetCloudResourceList.name,
      watches: ['accessId', 'regionId'],
      pager: true,
      search: true,
    })
  )
  cloudResources!: string[];



  @TaskInput({
    title: '证书部署类型',
    value: 'default',
    component: {
      name: 'a-select',
      options: [
        { value: 'default', label: '默认证书' },
        { value: 'extension', label: '扩展证书' },
      ],
    },
    required: true,
  })
  certType!: string;

  async onInstance() { }

  async getWafClient(access: AliyunAccess) {
    const client = new AliyunClient({ logger: this.logger });
    await client.init({
      accessKeyId: access.accessKeyId,
      accessKeySecret: access.accessKeySecret,
      endpoint: `https://wafopenapi.${this.regionId}.aliyuncs.com`,
      apiVersion: '2021-10-01',
    });
    return client;
  }

  async getInstanceId(client: AliyunClient) {
    const params = {
      RegionId: this.regionId,
    };
    this.logger.info('调用DescribeInstance API', JSON.stringify(params));
    const res = await client.request('DescribeInstance', params);
    this.logger.info('获取实例ID', res.InstanceId);
    return res.InstanceId;
  }

  async execute(): Promise<void> {
    this.logger.info('开始部署证书到阿里云WAF(云产品接入)');
    const access = await this.getAccess<AliyunAccess>(this.accessId);
    let certId: any = this.cert;
    if (typeof this.cert === 'object') {
      const sslClient = new AliyunSslClient({
        access,
        logger: this.logger,
        endpoint: this.casEndpoint,
      });

      const cert = this.cert as CertInfo;
      const casCert = this.cert as CasCertInfo;
      if (cert.crt) {
        const certIdRes = await sslClient.uploadCertificate({
          name: this.buildCertName(CertReader.getMainDomain(cert.crt)),
          cert: cert,
        });
        certId = certIdRes.certId as any;
      } else if (casCert.certIdentifier) {
        // 使用certIdentifier，它已经包含了regionid
        certId = casCert.certIdentifier;
      } else if (casCert.certId) {
        certId = casCert.certId;
      } else {
        throw new Error('证书格式错误'+JSON.stringify(this.cert));
      }
    }

    const client = await this.getWafClient(access);
    const instanceId = await this.getInstanceId(client);
    for (const cloudResourceId of this.cloudResources) {
      this.logger.info('开始部署', cloudResourceId);
      
      if (this.certType === 'default') {
        // 部署默认证书
        const params = {
          RegionId: this.regionId,
          InstanceId: instanceId,
          CloudResourceId: cloudResourceId,
          CertId: certId,
        };
        this.logger.info('调用ModifyCloudResourceDefaultCert API', JSON.stringify(params));
        const res = await client.request('ModifyCloudResourceDefaultCert', params);
        this.logger.info('部署默认证书成功', JSON.stringify(res));
      } else if (this.certType === 'extension') {
        // 部署扩展证书
        const addCertParams = {
          RegionId: this.regionId,
          InstanceId: instanceId,
          CloudResourceId: cloudResourceId,
          CertId: certId,
        };
        this.logger.info('调用CreateCloudResourceExtensionCert API', JSON.stringify(addCertParams));
        const addCertRes = await client.request('CreateCloudResourceExtensionCert', addCertParams);
        this.logger.info('部署扩展证书成功', JSON.stringify(addCertRes));
        
        // 清理过期扩展证书
        await this.cleanupExpiredExtensionCerts(client, instanceId, cloudResourceId, certId);
      }
    }
  }

  async cleanupExpiredExtensionCerts(client: AliyunClient, instanceId: string, cloudResourceId: string, currentCertId: string) {
    try {
      this.logger.info('开始清理过期扩展证书, cloudResourceId: ' + cloudResourceId);
      
      // 解析CloudResourceId获取ResourceInstanceId
      // CloudResourceId格式：{ResourceInstanceId}-{Port}-{ResourceProduct}
      const resourceInfo = cloudResourceId.split('-');
      if (resourceInfo.length < 3) {
        this.logger.warn('CloudResourceId格式不正确: ' + cloudResourceId);
        return;
      }
      // 从后往前解析，因为ResourceInstanceId可能包含"-"
      const product = resourceInfo.pop();
      const port = resourceInfo.pop();
      const resourceInstanceId = resourceInfo.join('-');
      this.logger.info('ResourceInstanceId: ' + resourceInstanceId, 'Port: ' + port, 'Product: ' + product);
      // 查询云产品实例的证书列表
      const certsParams = {
        InstanceId: instanceId,
        RegionId: this.regionId,
        ResourceInstanceId: resourceInstanceId,
        PageSize: 100,
      };
      this.logger.info('调用DescribeResourceInstanceCerts API: ' + JSON.stringify(certsParams));
      const certsRes = await client.request('DescribeResourceInstanceCerts', certsParams);
      
      if (!certsRes || !certsRes.Certs || certsRes.Certs.length === 0) {
        this.logger.info('没有找到证书, cloudResourceId: ' + cloudResourceId);
        return;
      }
      this.logger.info('查询到的证书数量: ' + certsRes.Certs.length);
      const now = Date.now();
      const expiredCerts = certsRes.Certs.filter((cert: any) => {
        // 检查证书是否有必要的属性
        if (!cert || !cert.AfterDate || !cert.CertIdentifier) {
          this.logger.warn('证书格式不正确: ' + JSON.stringify(cert));
          return false;
        }
        
        // 检查是否为当前部署的证书
        if (cert.CertIdentifier === currentCertId) {
          return false;
        }
        // 确保AfterDate是数字类型
        const afterDate = cert.AfterDate;
        // 检查是否过期
        return afterDate < now;
      });
      
      if (expiredCerts.length === 0) {
        this.logger.info('没有过期的扩展证书, cloudResourceId: ' + cloudResourceId);
        return;
      }
      this.logger.info('过期的扩展证书数量: ' + expiredCerts.length);
      
      // 删除过期的扩展证书
      for (const expiredCert of expiredCerts) {
        const deleteParams = {
          RegionId: this.regionId,
          InstanceId: instanceId,
          CloudResourceId: cloudResourceId,
          CertId: expiredCert.CertIdentifier,
        };
        this.logger.info('调用DeleteCloudResourceExtensionCert API: ' + JSON.stringify(deleteParams));
        const deleteRes = await client.request('DeleteCloudResourceExtensionCert', deleteParams);
        this.logger.info('删除过期扩展证书成功, certId: ' + expiredCert.CertIdentifier + ', response: ' + JSON.stringify(deleteRes));
      }
      
      this.logger.info('清理过期扩展证书完成, cloudResourceId: ' + cloudResourceId + ', deletedCount: ' + expiredCerts.length);
    } catch (error) {
      this.logger.error('清理过期扩展证书失败, cloudResourceId: ' + cloudResourceId + ', error: ' + JSON.stringify(error));
      // 清理失败不影响主流程
    }
  }

  async onGetCloudResourceList(data: PageSearch) {
    if (!this.accessId) {
      throw new Error('请选择Access授权');
    }
    const access = await this.getAccess<AliyunAccess>(this.accessId);
    const client = await this.getWafClient(access);

    const pager = new Pager(data)

    const instanceId = await this.getInstanceId(client);
    const params: any = {
      InstanceId: instanceId,
      MaxResults: pager.pageSize,
      RegionId: this.regionId,
    };
    if (data.searchKey) {
      params.CloudResourceId = data.searchKey;
      params.ResourceInstanceId = data.searchKey;
    }

    this.logger.info('调用DescribeCloudResourceList API', JSON.stringify(params));
    const res = await client.request('DescribeCloudResourceList', params);
    this.logger.info('DescribeCloudResourceList API返回', JSON.stringify(res));
    
    if (!res || !res.CloudResourceList || res.CloudResourceList.length === 0) {
      this.logger.warn('没有找到云产品接入的资源');
      return {
        list: [],
        total: 0,
        pageNo: pager.pageNo,
        pageSize: pager.pageSize
      };
    }
    const total = res.TotalCount || 0;

    const options = res.CloudResourceList.map((item: any) => {
      return {
        label: `${item.CloudResourceId} (${item.ResourceProduct})`,
        value: item.CloudResourceId,
        title: item.CloudResourceId,
        resourceProduct: item.ResourceProduct,
      };
    });
    const list = this.ctx.utils.options.buildGroupOptions(options, this.certDomains);

    return {
      list,
      total: total,
      pageNo: pager.pageNo,
      pageSize: pager.pageSize
    };
  }
}

new AliyunDeployCertToWafCloud();