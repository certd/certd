import { AbstractTaskPlugin, IsTaskPlugin, PageSearch, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { AliyunAccess } from "../../../plugin-lib/aliyun/access/index.js";

@IsTaskPlugin({
  name: "AliyunDeployCertToVod",
  title: "阿里云-部署至VOD",
  icon: "svg:icon-aliyun",
  group: pluginGroups.aliyun.key,
  desc: "部署证书到阿里云视频点播（vod）",
  needPlus: false,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed
    }
  }
})
export class AliyunDeployCertToVod extends AbstractTaskPlugin {
  @TaskInput({
    title: "域名证书",
    helper: "请选择证书申请任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames]
    },
    required: true
  })
  cert!: CertInfo;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  // @TaskInput({
  //   title: "大区",
  //   value: "cn-hangzhou",
  //   component: {
  //     name: "a-auto-complete",
  //     vModel: "value",
  //     options: [
  //       { value: "cn-hangzhou", label: "华东1（杭州）" },
  //       { value: "ap-southeast-1", label: "新加坡" }
  //     ]
  //   },
  //   required: true
  // })
  // regionId!: string;

  @TaskInput({
    title: "证书接入点",
    helper: "不会选就保持默认即可",
    value: "cas.aliyuncs.com",
    component: {
      name: "a-select",
      options: [
        { value: "cas.aliyuncs.com", label: "中国大陆" },
        { value: "cas.ap-southeast-1.aliyuncs.com", label: "新加坡" },
        { value: "cas.eu-central-1.aliyuncs.com", label: "德国（法兰克福）" }
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
      title: "加速域名",
      helper: "请选择要部署证书的域名",
      action: AliyunDeployCertToVod.prototype.onGetDomainList.name,
      watches: ["accessId"],
      pager: true,
      search: true
    })
  )
  domainList!: string[];


  async onInstance() {
  }


  async execute(): Promise<void> {
    this.logger.info("开始部署证书到阿里云VOD");
    const access = await this.getAccess<AliyunAccess>(this.accessId);

    const client = await this.getClient(access);


    for (const siteId of this.domainList) {
      /**
       * let queries : {[key: string ]: any} = { };
       *     queries["DomainName"] = "324234234";
       *     queries["CertName"] = "ccccccc";
       *     queries["SSLProtocol"] = "on";
       *     queries["SSLPub"] = "cert";
       *     queries["SSLPri"] = "key";
       *     // runtime options
       *     let runtime = new $Util.RuntimeOptions({ });
       *     let request = new $OpenApi.OpenApiRequest({
       *       query: OpenApiUtil.query(queries),
       *     });
       */
      const res = await client.doRequest({
        action: "SetVodDomainCertificate",
        version: "2017-03-21",
        protocol: "HTTPS",
        data: {
          query: {
            DomainName: siteId,
            CertName: this.appendTimeSuffix("certd"),
            SSLProtocol: "on",
            SSLPub: this.cert.crt,
            SSLPri: this.cert.key
          }
        }
      });
      this.logger.info(`部署站点[${siteId}]证书成功：${JSON.stringify(res)}`);
    }
  }

  async getClient(access: AliyunAccess) {
    const endpoint = `vod.cn-shanghai.aliyuncs.com`;
    return access.getClient(endpoint);
  }

  async onGetDomainList(data: PageSearch) {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }
    const access = await this.getAccess<AliyunAccess>(this.accessId);

    /**
     * let queries : {[key: string ]: any} = { };
     *     queries["PageSize"] = 50;
     *     queries["PageNumber"] = 1;
     *     queries["DomainName"] = "5555";
     *     // runtime options
     *     let runtime = new $Util.RuntimeOptions({ });
     *     let request = new $OpenApi.OpenApiRequest({
     *       query: OpenApiUtil.query(queries),
     *     });
     */
    const client = await this.getClient(access);
    const res = await client.doRequest({
      action: "DescribeVodUserDomains",
      version: "2017-03-21",
      protocol: "HTTPS",
      data: {
        query: {
          DomainName: data.searchKey,
          PageNumber: data.pageNo,
          PageSize: data.pageSize
        }
      }
    });

    const list = res?.Domains.PageData;
    if (!list || list.length === 0) {
      throw new Error("没有找到加速域名，请先在阿里云添加点播加速域名");
    }

    const options = list.map((item: any) => {
      return {
        label: item.DomainName,
        value: item.DomainName,
        domain: item.DomainName
      };
    });
    return this.ctx.utils.options.buildGroupOptions(options, this.certDomains);
  }

}

new AliyunDeployCertToVod();
