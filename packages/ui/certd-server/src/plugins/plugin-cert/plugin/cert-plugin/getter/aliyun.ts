import { IsTaskPlugin, Pager, PageSearch, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { AliyunAccess } from "../../../../plugin-lib/aliyun/access/index.js";
import { CertApplyBasePlugin } from "../base.js";
import { CertReader, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import dayjs from "dayjs";

const APPLY_CERTIFICATE_POLL_INTERVAL_MS = 5000;
const APPLY_CERTIFICATE_TIMEOUT_MS = 10 * 60 * 1000;
const NEW_CERTIFICATE_POLL_INTERVAL_MS = 60 * 1000;
const NEW_CERTIFICATE_MAX_CHECKS = 10;

type AliyunInstanceDetailV2 = {
  CertificateId?: string;
  CertificateNotAfter?: number | string;
};

@IsTaskPlugin({
  name: "CertApplyGetFormAliyun",
  icon: "ph:certificate",
  title: "获取阿里云订阅证书",
  group: pluginGroups.cert.key,
  desc: "从阿里云拉取订阅模式的商用证书（支持 API 1.0 和 2.0）",
  i18n: {
    "en-US": {
      title: "Get Alibaba Cloud Subscription Certificate",
      desc: "Retrieve commercial certificates purchased through Alibaba Cloud subscription plans (API 1.0 and 2.0 supported).",
      input: {
        domains: { title: "Certificate Domains", component: { placeholder: "Enter certificate domains or IPs" }, helper: "Enter the domains covered by this certificate." },
        accessId: { title: "Access Credentials", helper: "Alibaba Cloud AccessKey ID and AccessKey Secret." },
        apiVersion: { title: "Certificate API Version", component: { optionsMapping: { v1: "API 1.0 (Legacy)", v2: "API 2.0 (Current)" } }, helper: "Select the Alibaba Cloud Certificate API version." },
        orderId: { title: "Certificate Order or Instance ID", helper: "Certificate order ID for subscription certificates." },
        renewDays: { title: "Renewal Window (Days)" },
        forceUpdate: { title: "Force Renewal" },
        pfxPassword: { title: "Certificate Encryption Password", helper: "Choose whether to encrypt PFX and JKS certificates. If omitted, PFX uses an empty password and JKS uses 123456." },
        pfxArgs: {
          title: "PFX Conversion Options",
          component: {
            optionsMapping: {
              "": "Latest Windows Server compatibility",
              "-macalg SHA1 -keypbe PBE-SHA1-3DES -certpbe PBE-SHA1-3DES": "Windows Server 2016 compatibility",
              "-nomac -keypbe PBE-SHA1-3DES -certpbe PBE-SHA1-3DES": "Windows Server 2008 compatibility",
            },
          },
          helper: "Options for compatibility with different Windows Server versions.",
        },
      },
      output: { cert: { title: "Domain Certificate" }, certMd5: { title: "Certificate MD5" } },
    },
  },
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

  @TaskInput({
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
  })
  apiVersion!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "证书订单 ID",
      helper: "订阅模式的证书订单 Id",
      typeName: "CertApplyGetFormAliyun",
      component: {
        name: "RemoteSelect",
        vModel: "value",
        pager: true,
        single: true,
      },
      action: CertApplyGetFormAliyunPlugin.prototype.onGetOrderList.name,
    })
  )
  orderId!: string;

  async onInit(): Promise<void> {}

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
    if (Array.isArray(this.orderId) && this.orderId.length > 0) {
      this.orderId = this.orderId[0];
    }

    const lastCert = await this.readLastCert();
    const currentCertificateNotAfter = lastCert?.expires;
    const instanceDetail = await this.getInstanceDetailV2(client, this.orderId);
    let certificateId = instanceDetail.CertificateId;
    if (!this.isNewCertificate(instanceDetail.CertificateNotAfter, currentCertificateNotAfter) || !certificateId) {
      await this.applyCertificateV2(client, this.orderId);
      certificateId = await this.waitForNewCertificateV2(client, this.orderId, currentCertificateNotAfter);
    } else {
      this.logger.info(`实例中已有新证书，直接使用证书 ID:${certificateId}`);
    }

    if (!certificateId) {
      throw new Error(`未找到阿里云证书 ID，实例 ID:${this.orderId}`);
    }

    this.logger.info(`获取到证书 ID:${certificateId}`);
    const certDetail = await this.getCertDetail(client, certificateId);
    this.logger.info(`获取到证书:${certDetail.getAllDomains()}, 过期时间：${dayjs(certDetail.expires).format("YYYY-MM-DD HH:mm:ss")}`);
    return certDetail;
  }

  async waitForNewCertificateV2(client: any, instanceId: string, currentCertificateNotAfter?: number): Promise<string> {
    for (let checkCount = 1; checkCount <= NEW_CERTIFICATE_MAX_CHECKS; checkCount++) {
      this.checkSignal();
      const instanceDetail = await this.getInstanceDetailV2(client, instanceId);
      if (instanceDetail.CertificateId && this.isNewCertificate(instanceDetail.CertificateNotAfter, currentCertificateNotAfter)) {
        this.logger.info(`获取到新证书 ID:${instanceDetail.CertificateId}`);
        return instanceDetail.CertificateId;
      }

      this.logger.info(`实例证书尚未更新，${checkCount}/${NEW_CERTIFICATE_MAX_CHECKS} 次检查未发现新证书`);
      if (checkCount < NEW_CERTIFICATE_MAX_CHECKS) {
        await this.sleep(NEW_CERTIFICATE_POLL_INTERVAL_MS);
      }
    }

    throw new Error(`等待阿里云新证书生成超时，实例 ID:${instanceId}`);
  }

  isNewCertificate(certificateNotAfter: number | string | undefined, currentCertificateNotAfter?: number): boolean {
    if (certificateNotAfter == null) {
      return false;
    }
    if (currentCertificateNotAfter == null) {
      return true;
    }

    const certificateExpires = this.normalizeTimestamp(certificateNotAfter);
    const currentCertificateExpires = this.normalizeTimestamp(currentCertificateNotAfter);
    return certificateExpires != null && currentCertificateExpires != null && certificateExpires !== currentCertificateExpires;
  }

  normalizeTimestamp(timestamp: number | string): number {
    const value = Number(timestamp);
    if (value > 0 && value < 1_000_000_000_000) {
      return value * 1000;
    }
    return value;
  }

  async applyCertificateV2(client: any, instanceId: string): Promise<void> {
    await client.doRequest({
      action: "ApplyCertificate",
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

    this.logger.info(`已提交证书申请，实例 ID:${instanceId}`);
    const startTime = Date.now();
    while (Date.now() - startTime < APPLY_CERTIFICATE_TIMEOUT_MS) {
      this.checkSignal();
      const task = await client.doRequest({
        action: "GetTaskAttribute",
        version: "2020-04-07",
        protocol: "HTTPS",
        method: "POST",
        authType: "AK",
        style: "RPC",
        pathname: `/`,
        data: {
          query: {
            TaskType: "ApplyCertificate",
            TaskId: instanceId,
          },
        },
      });

      if (task.TaskStatus === "success") {
        this.logger.info(`证书申请提交成功，实例 ID:${instanceId}`);
        return;
      }
      if (task.TaskStatus === "failed") {
        const errorMessage = task.TaskMessage || "未知错误";
        throw new Error(`阿里云证书申请提交失败：${errorMessage}`);
      }
      if (task.TaskStatus !== "processing") {
        throw new Error(`阿里云证书申请返回未知任务状态：${task.TaskStatus || "空"}`);
      }

      this.logger.info("阿里云证书申请仍在处理中，5 秒后继续查询");
      await this.sleep(APPLY_CERTIFICATE_POLL_INTERVAL_MS);
    }

    throw new Error(`阿里云证书申请提交超时，实例 ID:${instanceId}`);
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

  async getInstanceDetailV2(client: any, instanceId: string): Promise<AliyunInstanceDetailV2> {
    return await client.doRequest({
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
      return {
        list: [],
        total: 0,
      };
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
      return {
        list: [],
        total: 0,
      };
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
