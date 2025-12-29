import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo, CertReader } from "@certd/plugin-cert";
import {
  AliyunAccess, AliyunClientV2,
  AliyunSslClient,
  createCertDomainGetterInputDefine,
  createRemoteSelectInputDefine
} from "@certd/plugin-lib";

@IsTaskPlugin({
  name: "AliyunDeployCertToESA",
  title: "阿里云-部署至ESA",
  icon: "svg:icon-aliyun",
  group: pluginGroups.aliyun.key,
  desc: "部署证书到阿里云ESA(边缘安全加速)，自动删除过期证书",
  needPlus: false,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed
    }
  }
})
export class AliyunDeployCertToESA extends AbstractTaskPlugin {
  @TaskInput({
    title: "域名证书",
    helper: "请选择证书申请任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames, 'uploadCertToAliyun']
    },
    required: true
  })
  cert!: CertInfo;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  @TaskInput({
    title: "大区",
    value: "cn-hangzhou",
    component: {
      name: "a-auto-complete",
      vModel: "value",
      options: [
        { value: "cn-hangzhou", label: "华东1（杭州）" },
        { value: "ap-southeast-1", label: "新加坡" }
      ]
    },
    required: true
  })
  regionId!: string;

  @TaskInput({
    title: "证书接入点",
    helper: "不会选就保持默认即可",
    value: "cas.aliyuncs.com",
    component: {
      name: "a-select",
      options: [
        { value: "cas.aliyuncs.com", label: "中国大陆" },
        { value: "cas.ap-southeast-1.aliyuncs.com", label: "新加坡" }
        // { value: "cas.eu-central-1.aliyuncs.com", label: "德国（法兰克福）" }
      ]
    },
    required: true
  })
  casEndpoint!: string;


  @TaskInput({
    title: "Access授权",
    helper: "阿里云授权AccessKeyId、AccessKeySecret",
    component: {
      name: "access-selector",
      type: "aliyun"
    },
    required: true
  })
  accessId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "站点",
      helper: "请选择要部署证书的站点",
      action: AliyunDeployCertToESA.prototype.onGetSiteList.name,
      watches: ["accessId", "regionId"]
    })
  )
  siteIds!: string[];


  async onInstance() {
  }

  async getAliyunCertId(access: AliyunAccess) {
    let certId: any = this.cert;
    let certName: any = this.appendTimeSuffix("certd");
    if (typeof this.cert === "object") {
      const sslClient = new AliyunSslClient({
        access,
        logger: this.logger,
        endpoint: this.casEndpoint
      });

      certName = this.buildCertName(CertReader.getMainDomain(this.cert.crt));

      certId = await sslClient.uploadCert({
        name: certName,
        cert: this.cert
      });
      this.logger.info("上传证书成功", certId, certName);
    }
    return {
      certId,
      certName
    };
  }

  async execute(): Promise<void> {
    this.logger.info("开始部署证书到阿里云");
    const access = await this.getAccess<AliyunAccess>(this.accessId);

    const client = await this.getClient(access);

    const { certId, certName } = await this.getAliyunCertId(access);

    for (const siteId of this.siteIds) {

      try{
        await this.clearSiteCert(client,siteId);
      }catch (e) {
        this.logger.error("清理站点[${siteId}]证书失败",e)
      }

      try {
        const res = await client.doRequest({
          // 接口名称
          action: "SetCertificate",
          // 接口版本
          version: "2024-09-10",
          data: {
             body:{
               SiteId: siteId,
               CasId: certId,
               Type: "cas",
               Name: certName
             }
          }
        });
        this.logger.info(`部署站点[${siteId}]证书成功：${JSON.stringify(res)}`);

      } catch (e) {
        if (e.message.includes("Certificate.Duplicated")) {
          this.logger.info(`站点[${siteId}]证书已存在,无需重复部署`);
        }else{
          throw e;
        }
      }finally{
        try{
          await this.clearSiteCert(client,siteId);
        }catch (e) {
          this.logger.error("清理站点[${siteId}]证书失败",e)
        }
      }
    }
  }


  async getClient(access: AliyunAccess) {
    const endpoint = `esa.${this.regionId}.aliyuncs.com`;
    return access.getClient(endpoint);
  }

  async onGetSiteList(data: any) {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }
    const access = await this.getAccess<AliyunAccess>(this.accessId);

    const client = await this.getClient(access);
    const res = await client.doRequest({
      action: "ListSites",
      version: "2024-09-10",
      method: "GET",
      data: {}
    });

    const list = res?.Sites;
    if (!list || list.length === 0) {
      throw new Error("没有找到站点，请先创建站点");
    }

    const options = list.map((item: any) => {
      return {
        label: item.SiteName,
        value: item.SiteId,
        domain: item.SiteName
      };
    });
    return this.ctx.utils.options.buildGroupOptions(options, this.certDomains);
  }

  async clearSiteCert(client: AliyunClientV2, siteId: string) {
    this.logger.info(`开始清理站点[${siteId}]过期证书`);
    const certListRes = await client.doRequest({
      action: "ListCertificates",
      version: "2024-09-10",
      method: "GET",
      data:{
        query: {
          SiteId: siteId
        }
      }
    });

    const list = certListRes.Result;
    for (const item of list) {
      this.logger.info(`证书${item.Name}状态：${item.Status}`);
      if (item.Status === "Expired") {
        this.logger.info(`证书${item.Name}已过期，执行删除`);
        try{
          await client.doRequest({
            action: "DeleteCertificate",
            version: "2024-09-10",
            // 接口 HTTP 方法
            method: "GET",
            data:{
              query: {
                SiteId: siteId,
                Id: item.id
              }
            }
          });
          this.logger.info(`证书${item.Name}已删除`);
        }catch (e) {
          this.logger.error(`过期证书${item.Name}删除失败：`,e.message)
        }

      }
    }
  }
}

new AliyunDeployCertToESA();
