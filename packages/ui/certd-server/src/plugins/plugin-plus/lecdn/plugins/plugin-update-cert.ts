import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertInfo } from "@certd/plugin-cert";
import { LeCDNAccess } from "../access.js";
import { merge } from "lodash-es";
import { createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { CertApplyPluginNames } from "@certd/plugin-cert";
@IsTaskPlugin({
  name: "LeCDNUpdateCert",
  title: "LeCDN-更新证书",
  icon: "material-symbols:shield-outline",
  group: pluginGroups.cdn.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
  needPlus: false,
})
export class LeCDNUpdateCert extends AbstractTaskPlugin {
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
      typeName: "LeCDNUpdateCert",
      action: LeCDNUpdateCert.prototype.onGetCertList.name,
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
    const res = await this.ctx.http.request({
      baseURL: access.url,
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      ...config,
    });
    this.checkRes(res);
    return res.data;
  }

  async getToken() {
    // http://cdnadmin.kxfox.com/prod-api/login
    const access = this.access;
    const res = await this.ctx.http.request({
      url: `/prod-api/login`,
      baseURL: access.url,
      method: "post",
      data: {
        username: access.username,
        password: access.password,
      },
    });
    this.checkRes(res);
    return res.data.access_token;
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
      ssl_key: cert.key,
      ssl_pem: cert.crt,
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
    if (res.code !== 0) {
      throw new Error(res.message);
    }
  }

  async onGetCertList(data: any) {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }
    const res = await this.getCerts();

    if (!res || res.data.length === 0) {
      throw new Error("没有找到证书,请先手动上传一次证书，并让站点使用该证书");
    }

    return res.data.map((item: any) => {
      return {
        label: `${item.name}-${item.description}<${item.id}>`,
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

new LeCDNUpdateCert();
