import { IsTaskPlugin, PageSearch, pluginGroups, RunStrategy, Step, TaskInput, TaskOutput } from "@certd/pipeline";
import type { CertInfo } from "../acme.js";
import { CertReader } from "../cert-reader.js";
import { CertApplyBasePlugin } from "../base.js";
import { AliyunAccess, createRemoteSelectInputDefine } from "@certd/plugin-lib";

export { CertReader };
export type { CertInfo };

@IsTaskPlugin({
  name: "CertApplyGetFormAliyun",
  icon: "ph:certificate",
  title: "获取阿里云订阅证书",
  group: pluginGroups.cert.key,
  desc: "从阿里云拉取订阅模式的商用证书",
  default: {
    strategy: {
      runStrategy: RunStrategy.AlwaysRun,
    },
  },
})
export class CertApplyGetFormAliyunPlugin extends CertApplyBasePlugin {
  @TaskInput({
    title: "Access授权",
    helper: "阿里云授权AccessKeyId、AccessKeySecret",
    component: {
      name: "access-selector",
      type: "aliyun",
    },
    required: true,
  })
  accessId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "证书订单ID",
      helper: "订阅模式的证书订单Id",
      typeName: "CertApplyGetFormAliyun",
      action: CertApplyGetFormAliyunPlugin.prototype.onGetOrderList.name,
    })
  )
  orderId!: number;

  async onInit(): Promise<void> {}

  async doCertApply(): Promise<CertReader> {
    const access = await this.getAccess<AliyunAccess>(this.accessId);
    const client = await access.getClient("cas.aliyuncs.com");
    const certDetail = await this.getCertDetail(client, this.orderId);
    return certDetail;
  }

  async getCertDetail(client: any, certId: any) {
    const res = await client.doRequest({
      // 接口名称
      // 接口名称
      action: "GetUserCertificateDetail",
      // 接口版本
      version: "2020-04-07",
      // 接口协议
      protocol: "HTTPS",
      // 接口 HTTP 方法
      method: "POST",
      authType: "AK",
      style: "RPC",
      // 接口 PATH
      pathname: `/`,
      data: {
        query: {
          CertId: certId,
        },
      },
    });

    const crt = res.Cert;
    const key = res.Key;

    return new CertReader({
      crt,
      key,
      csr: "",
    });
  }

  async getCertificateState(client: any, orderId: any) {
    const res = await client.doRequest({
      // 接口名称
      action: "DescribeCertificateState",
      // 接口版本
      version: "2020-04-07",
      // 接口协议
      protocol: "HTTPS",
      // 接口 HTTP 方法
      method: "POST",
      authType: "AK",
      style: "RPC",
      // 接口 PATH
      pathname: `/`,
      data: {
        query: {
          OrderId: orderId,
        },
      },
    });

    return res.CertId;
  }

  async onGetOrderList(req: PageSearch) {
    if (!this.accessId) {
      throw new Error("请先选择Access授权");
    }
    const access = await this.getAccess<AliyunAccess>(this.accessId);

    const client = await access.getClient("cas.aliyuncs.com");

    const res = await client.doRequest({
      // 接口名称
      action: "ListUserCertificateOrder",
      // 接口版本
      version: "2020-04-07",
      method: "POST",
      authType: "AK",
      style: "RPC",
      // 接口 PATH
      pathname: `/`,
      data: {
        query: {
          Status: "ISSUED",
        },
      },
    });
    const list = res?.CertificateOrderList || [];
    if (!list || list.length === 0) {
      throw new Error("没有找到已签发的证书订单");
    }

    return list.map((item: any) => {
      const label = `${item.Domain}<${item.OrderId}>`;
      return {
        label: label,
        value: item.OrderId,
        Domain: item.Domain,
      };
    });
  }
}

new CertApplyGetFormAliyunPlugin();
