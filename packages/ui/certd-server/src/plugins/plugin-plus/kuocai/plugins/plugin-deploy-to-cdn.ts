import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { KuocaiCdnAccess } from "../access.js";

@IsTaskPlugin({
  name: "KuocaiDeployToRCDN",
  title: "括彩云-部署到括彩云CDN",
  icon: "material-symbols:shield-outline",
  group: pluginGroups.cdn.key,
  desc: "括彩云CDN，每月免费30G，[注册即领](https://kuocaicdn.com/register?code=8mn536rrzfbf8)",
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
  needPlus: false,
})
export class KuocaiDeployToCDNPlugin extends AbstractTaskPlugin {
  //证书选择，此项必须要有
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames],
    },
    required: true,
  })
  cert!: CertInfo;

  //授权选择框
  @TaskInput({
    title: "括彩云CDN授权",
    helper: "括彩云CDN授权",
    component: {
      name: "access-selector",
      type: "kuocaicdn",
    },
    required: true,
  })
  accessId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "域名列表",
      helper: "选择要部署证书的站点域名",
      typeName: "KuocaiDeployToCDNPlugin",
      action: KuocaiDeployToCDNPlugin.prototype.onGetDomainList.name,
    })
  )
  domains!: string[];

  async onInstance() {}
  async execute(): Promise<void> {
    const access = await this.getAccess<KuocaiCdnAccess>(this.accessId);
    const loginRes = await this.getLoginToken(access);

    const curl = "https://kuocaicdn.com/CdnDomainHttps/httpsConfiguration";
    for (const domain of this.domains) {
      // const data = {
      //   doMainId: domain,
      //   https: {
      //     https_status: "off"
      //   },
      // }
      // //先关闭https
      // const res = await this.doRequest(curl, loginRes, data);

      const cert = this.cert;
      const update = {
        doMainId: domain,
        https: {
          https_status: "on",
          certificate_name: this.appendTimeSuffix("certd"),
          certificate_source: "0",
          certificate_value: cert.crt,
          private_key: cert.key,
        },
      };
      await this.doRequest(curl, loginRes, update);
      this.logger.info(`站点${domain}证书更新成功`);
    }
  }

  async getLoginToken(access: KuocaiCdnAccess) {
    const url = "https://kuocaicdn.com/login/loginUser";
    const data = {
      userAccount: access.username,
      userPwd: access.password,
      remember: true,
    };
    const http = this.ctx.http;
    const res: any = await http.request({
      url,
      method: "POST",
      data,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      returnOriginRes: true,
    });
    if (!res.data?.success) {
      throw new Error(res.data?.message);
    }

    const jsessionId = this.ctx.utils.request.getCookie(res, "JSESSIONID");
    const token = res.data?.data;
    return {
      jsessionId,
      token,
    };
  }

  async getDomainList(loginRes: any) {
    const url = "https://kuocaicdn.com/CdnDomain/queryForDatatables";
    const data = {
      draw: 1,
      start: 0,
      length: 1000,
      search: {
        value: "",
        regex: false,
      },
    };

    const res = await this.doRequest(url, loginRes, data);
    return res.data?.data;
  }

  private async doRequest(url: string, loginRes: any, data: any) {
    const http = this.ctx.http;
    const res: any = await http.request({
      url,
      method: "POST",
      headers: {
        Cookie: `JSESSIONID=${loginRes.jsessionId};kuocai_cdn_token=${loginRes.token}`,
      },
      data,
    });
    if (!res.success) {
      throw new Error(res.message);
    }
    return res;
  }

  async onGetDomainList(data: any) {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }
    const access = await this.getAccess<KuocaiCdnAccess>(this.accessId);

    const loginRes = await this.getLoginToken(access);

    const list = await this.getDomainList(loginRes);

    if (!list || list.length === 0) {
      throw new Error("您账户下还没有站点域名，请先添加域名");
    }
    return list.map((item: any) => {
      return {
        label: `${item.domainName}<${item.id}>`,
        value: item.id,
      };
    });
  }
}
new KuocaiDeployToCDNPlugin();
