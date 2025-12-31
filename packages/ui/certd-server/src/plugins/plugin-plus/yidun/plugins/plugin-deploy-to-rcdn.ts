import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { YidunRcdnAccess } from "../access-rcdn.js";

@IsTaskPlugin({
  name: "YidunDeployToRCDN",
  title: "易盾-部署到易盾RCDN",
  icon: "material-symbols:shield-outline",
  group: pluginGroups.cdn.key,
  desc: "易盾CDN，每月免费30G，[注册即领](https://rhcdn.yiduncdn.com/register?code=8mn536rrzfbf8)",
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
  needPlus: false,
})
export class YidunDeployToRCDNPlugin extends AbstractTaskPlugin {
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
    title: "易盾RCDN授权",
    helper: "易盾RCDN授权",
    component: {
      name: "access-selector",
      type: "yidunrcdn",
    },
    required: true,
  })
  accessId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "域名列表",
      helper: "选择要部署证书的站点域名",
      typeName: "YidunDeployToRCDNPlugin",
      action: YidunDeployToRCDNPlugin.prototype.onGetDomainList.name,
    })
  )
  domains!: string[];

  async onInstance() {}
  async execute(): Promise<void> {
    const access = await this.getAccess<YidunRcdnAccess>(this.accessId);
    const loginRes = await this.getLoginToken(access);

    const curl = "https://rhcdn.yiduncdn.com/CdnDomainHttps/httpsConfiguration";
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

  async getLoginToken(access: YidunRcdnAccess) {
    const url = "https://rhcdn.yiduncdn.com/login/loginUser";
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
    const url = "https://rhcdn.yiduncdn.com/CdnDomain/queryForDatatables";
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
    const access = await this.getAccess<YidunRcdnAccess>(this.accessId);

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
new YidunDeployToRCDNPlugin();
