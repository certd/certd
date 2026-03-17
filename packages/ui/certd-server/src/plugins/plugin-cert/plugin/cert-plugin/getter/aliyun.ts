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
    {
      title:"订单类型",
      value:"CPACK",
      component:{
        name:"a-select",
        vModel:"value",
        options:[
          {
            label:"资源虚拟订单（一般选这个）",
            value:"CPACK",
          },
          {
            label:"售卖订单",
            value:"BUY",
          }
        ]
      }
    }
  )
  orderType!: string;


  @TaskInput(
    createRemoteSelectInputDefine({
      title: "证书订单ID",
      helper: "订阅模式的证书订单Id",
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

  async onInit(): Promise<void> {}

  async doCertApply(): Promise<CertReader> {
    const access = await this.getAccess<AliyunAccess>(this.accessId);
    const client = await access.getClient("cas.aliyuncs.com");
    this.logger.info(`开始获取证书,orderId:${this.orderId}`);
    let orderId: any = this.orderId;
    if (!orderId) {
      throw new Error("请先输入证书订单ID");
    }
    if (typeof orderId !== "string") {
      orderId = parseInt(orderId);
    }
    const certState = await this.getCertificateState(client, orderId);
    this.logger.info(`获取到证书Id:${JSON.stringify(certState.CertId)}`);
    const certDetail = await this.getCertDetail(client, certState.CertId);
    this.logger.info(`获取到证书:${certDetail.getAllDomains()}, 过期时间：${dayjs(certDetail.expires).format("YYYY-MM-DD HH:mm:ss")}`);
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

  async getCertificateState(client: any, orderId: any): Promise<{ CertId: string; Type: string; Domain: string }> {
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

    return res;
  }

  async onGetOrderList(req: PageSearch) {
    if (!this.accessId) {
      throw new Error("请先选择Access授权");
    }
    const access = await this.getAccess<AliyunAccess>(this.accessId);

    const client = await access.getClient("cas.aliyuncs.com");

    const pager = new Pager(req)
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
          OrderType: this.orderType,
          Status: "ISSUED",
          CurrentPage: pager.pageNo,
          ShowSize : pager.pageSize,
        },
      },
    });
    const list = res?.CertificateOrderList || [];
    if (!list || list.length === 0) {
      return []
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
      list:records,
      total,
    }
  }
}

new CertApplyGetFormAliyunPlugin();
