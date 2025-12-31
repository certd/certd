import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { LeCDNAccess } from "../access.js";
import { merge } from "lodash-es";
import { createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { utils } from "@certd/basic";

@IsTaskPlugin({
  name: "LeCDNUpdateCertV2",
  title: "LeCDN-更新证书V2",
  desc: "支持新版本LeCDN",
  icon: "material-symbols:shield-outline",
  group: pluginGroups.cdn.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
  needPlus: false,
})
export class LeCDNUpdateCertV2 extends AbstractTaskPlugin {
  //授权选择框
  @TaskInput({
    title: "LeCDN授权",
    component: {
      name: "access-selector",
      type: "lecdn",
    },
    required: true,
  })
  accessId!: string;

  //测试参数
  @TaskInput(
    createRemoteSelectInputDefine({
      title: "证书ID",
      helper: "选择要更新的证书id，注意域名是否与证书匹配",
      typeName: "LeCDNUpdateCertV2",
      action: LeCDNUpdateCertV2.prototype.onGetCertList.name,
    })
  )
  certIds!: number[];

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

  access: LeCDNAccess;
  token: string;

  async onInstance() {
    this.access = await this.getAccess<LeCDNAccess>(this.accessId);
    this.token = await this.getToken();
  }

  async doRequest(config: any) {
    const access = this.access;
    const Authorization = this.access.type === "token" ? this.access.apiToken : `Bearer ${this.token}`;
    const res = await this.ctx.http.request({
      baseURL: access.url,
      headers: {
        Authorization,
      },
      ...config,
    });
    this.checkRes(res);
    return res.data;
  }

  async getToken() {
    if (this.access.type === "token") {
      return this.access.apiToken;
    }
    // http://cdnadmin.kxfox.com/prod-api/login
    const access = this.access;
    const res = await this.ctx.http.request({
      url: `/prod-api/login`,
      baseURL: access.url,
      method: "post",
      data: {
        //新旧版本不一样，旧版本是username，新版本是email
        email: access.username,
        username: access.username,
        password: access.password,
      },
    });
    this.checkRes(res);
    //新旧版本不一样，旧版本是access_token，新版本是token
    return res.data.access_token || res.data.token;
  }

  async getCertInfo(id: number) {
    // http://cdnadmin.kxfox.com/prod-api/certificate/9
    // Bearer edGkiOiIJ8
    return await this.doRequest({
      url: `/prod-api/certificate/${id}`,
      method: "get",
    });
  }

  async updateCert(id: number, cert: CertInfo) {
    const certInfo = await this.getCertInfo(id);
    const body = {
      ssl_key: utils.hash.base64(cert.key),
      ssl_pem: utils.hash.base64(cert.crt),
    };

    merge(certInfo, body);

    this.logger.info(`证书名称：${certInfo.name}`);

    return await this.doRequest({
      url: `/prod-api/certificate/${id}`,
      method: "put",
      data: certInfo,
    });
  }

  async execute(): Promise<void> {
    for (const certId of this.certIds) {
      this.logger.info(`更新证书：${certId}`);
      await this.updateCert(certId, this.cert);
      this.logger.info(`更新证书成功：${certId}`);
    }

    this.logger.info(`更新证书完成`);
  }

  private checkRes(res: any) {
    if (res.code !== 0 && res.code !== 200) {
      throw new Error(res.message);
    }
  }

  async onGetCertList(data: any) {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }
    const res = await this.getCerts();
    //新旧版本不一样，一个data 一个是items
    const list = res.items || res.data;
    if (!res || list.length === 0) {
      throw new Error("没有找到证书,请先手动上传一次证书，并让站点使用该证书");
    }

    return list.map((item: any) => {
      return {
        label: `${item.name}-${item.domain_name}<${item.id}>`,
        value: item.id,
      };
    });
  }

  private async getCerts() {
    //  http://cdnadmin.kxfox.com/prod-api/certificate?current_page=1&total=3&page_size=10
    return await this.doRequest({
      url: `/prod-api/certificate`,
      method: "get",
      params: {
        current_page: 1,
        page_size: 1000,
      },
    });
  }
}

new LeCDNUpdateCertV2();
