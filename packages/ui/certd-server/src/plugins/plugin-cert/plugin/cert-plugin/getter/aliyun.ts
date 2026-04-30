import { IsTaskPlugin, Pager, PageSearch, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { AliyunAccess } from "../../../../plugin-lib/aliyun/access/index.js";
import { CertApplyBasePlugin } from "../base.js";
import { CertReader, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import dayjs from "dayjs";

@IsTaskPlugin({
  name: "CertApplyGetFormAliyun",
  icon: "ph:certificate",
  title: "获取阿里云订阅证书",
  group: pluginGroups.cert.key,
  desc: "从阿里云拉取订阅模式的商用证书（支持 API 1.0 和 2.0）",
  default: {
    strategy: {
      runStrategy: RunStrategy.AlwaysRun,
    },
  },
})
export class CertApplyGetFormAliyunPlugin extends CertApplyBasePlugin {
  @TaskInput({
    title: "Access 授权",
    helper: "阿里云授权 AccessKeyId、AccessKeySecret",
    component: {
      name: "access-selector",
      type: "aliyun",
    },
    required: true,
  })
  accessId!: string;

  @TaskInput(
    {
      title: "证书API 版本",
      value: "v1",
      component: {
        name: "a-select",
        vModel: "value",
        options: [
          {
            label: "API 1.0 (旧版)",
            value: "v1",
          },
          {
            label: "API 2.0 (新版)",
            value: "v2",
          },
        ],
      },
      helper: "选择阿里云证书 API 版本",
    }
  )
  apiVersion!: string;


  @TaskInput(
    createRemoteSelectInputDefine({
      title: "证书订单 ID",
      helper: "订阅模式的证书订单 Id(在新建流水线时暂时无法获取，可以先随便填个数字，先创建，进入流水线编辑页面再获取选择即可)",
      typeName: "CertApplyGetFormAliyun",
      pageSize: 50,
      component: {
        name: "RemoteSelect",
        vModel: "value",
        pager: true,
      },
      action: CertApplyGetFormAliyunPlugin.prototype.onGetOrderList.name,
    })
  )
  orderId!: string;

  async onInit(): Promise<void> { }

  async doCertApply(): Promise<CertReader> {
    const access = await this.getAccess<AliyunAccess>(this.accessId);
    const client = await access.getClient("cas.aliyuncs.com");

    if (this.apiVersion === "v2") {
      return this.doCertApplyV2(client);
    } else {
      return this.doCertApplyV1(client);
    }
  }

  async doCertApplyV1(client: any): Promise<CertReader> {
    this.logger.info(`开始获取证书 (API 1.0),orderId:${this.orderId}`);
    let orderId: any = this.orderId;
    if (!orderId) {
      throw new Error("请先输入证书订单 ID");
    }
    if (typeof orderId !== "string") {
      orderId = parseInt(orderId);
    }
    const certState = await this.getCertificateState(client, orderId);
    this.logger.info(`获取到证书 Id:${JSON.stringify(certState.CertId)}`);
    const certDetail = await this.getCertDetail(client, certState.CertId);
    this.logger.info(`获取到证书:${certDetail.getAllDomains()}, 过期时间：${dayjs(certDetail.expires).format("YYYY-MM-DD HH:mm:ss")}`);
    return certDetail;
  }

  async doCertApplyV2(client: any): Promise<CertReader> {
    this.logger.info(`开始获取证书 (API 2.0),instanceId:${this.orderId}`);
    if (!this.orderId) {
      throw new Error("请先输入证书实例 ID");
    }
    const certificateId = await this.getOrderDetailV2(client, this.orderId);
    this.logger.info(`获取到证书 ID:${certificateId}`);
    const certDetail = await this.getCertDetail(client, certificateId);
    this.logger.info(`获取到证书:${certDetail.getAllDomains()}, 过期时间：${dayjs(certDetail.expires).format("YYYY-MM-DD HH:mm:ss")}`);
    return certDetail;
  }

  async getCertDetail(client: any, certId: any) {
    const res = await client.doRequest({
      action: "GetUserCertificateDetail",
      version: "2020-04-07",
      protocol: "HTTPS",
      method: "POST",
      authType: "AK",
      style: "RPC",
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

  async getOrderDetailV2(client: any, instanceId: string) {
    const instanceDetail = await client.doRequest({
      action: "GetInstanceDetail",
      version: "2020-04-07",
      protocol: "HTTPS",
      method: "POST",
      authType: "AK",
      style: "RPC",
      pathname: `/`,
      data: {
        query: {
          InstanceId: instanceId,
        },
      },
    });

    const certificateId = instanceDetail.CertificateId;
    if (!certificateId) {
      throw new Error(`未找到证书 ID，实例详情：${JSON.stringify(instanceDetail)}`);
    }

    return certificateId;
  }

  async getCertificateState(client: any, orderId: any): Promise<{ CertId: string; Type: string; Domain: string }> {
    const res = await client.doRequest({
      action: "DescribeCertificateState",
      version: "2020-04-07",
      protocol: "HTTPS",
      method: "POST",
      authType: "AK",
      style: "RPC",
      pathname: `/`,
      data: {
        query: {
          OrderId: orderId,
        },
      },
    });

    return res;
  }

  async onGetOrderList(req: PageSearch) {
    if (!this.accessId) {
      throw new Error("请先选择 Access 授权");
    }
    const access = await this.getAccess<AliyunAccess>(this.accessId);

    const client = await access.getClient("cas.aliyuncs.com");

    const pager = new Pager(req);

    if (this.apiVersion === "v2") {
      return this.onGetOrderListV2(client, pager);
    } else {
      return this.onGetOrderListV1(client, pager);
    }
  }

  async onGetOrderListV1(client: any, pager: Pager) {
    const res = await client.doRequest({
      action: "ListUserCertificateOrder",
      version: "2020-04-07",
      method: "POST",
      authType: "AK",
      style: "RPC",
      pathname: `/`,
      data: {
        query: {
          OrderType: "CPACK",
          Status: "ISSUED",
          CurrentPage: pager.pageNo,
          ShowSize: pager.pageSize,
        },
      },
    });
    const list = res?.CertificateOrderList || [];
    if (!list || list.length === 0) {
      return [];
    }

    const total = res.TotalCount || 0;

    const records = list.map((item: any) => {
      let value = item.OrderId;
      let domain = item.Domain;
      let label = `${item.Domain}<${item.OrderId}>`;
      if (!item.OrderId) {
        label = `${item.CommonName}<${item.Name}>`;
        value = item.Name;
        domain = item.CommonName;
      }
      return {
        label: label,
        value: value,
        Domain: domain,
      };
    });
    return {
      list: records,
      total,
    };
  }

  async onGetOrderListV2(client: any, pager: Pager) {
    const res = await client.doRequest({
      action: "ListInstances",
      version: "2020-04-07",
      method: "POST",
      authType: "AK",
      style: "RPC",
      pathname: `/`,
      data: {
        query: {
          Status: "normal",
          CurrentPage: pager.pageNo,
          ShowSize: pager.pageSize,
        },
      },
    });

    const list = res?.InstanceList || [];
    if (!list || list.length === 0) {
      return [];
    }

    const total = res.TotalCount || 0;

    const records = list.map((item: any) => {
      const value = item.InstanceId;
      const domain = item.Domain;
      const label = `${item.Domain}<${item.CertificateName}>`;
      return {
        label: label,
        value: value,
        Domain: domain,
      };
    });
    return {
      list: records,
      total,
    };
  }
}

new CertApplyGetFormAliyunPlugin();
