import { AbstractTaskPlugin, IsTaskPlugin, PageSearch, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { UCloudAccess } from "../access.js";

@IsTaskPlugin({
  name: "UCloudDeployToUS3",
  title: "UCloud-部署到对象存储(US3)",
  desc: "将证书部署到UCloud对象存储(US3)",
  icon: "svg:icon-ucloud",
  group: pluginGroups.ucloud.key,
  needPlus: false,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class UCloudDeployToUS3 extends AbstractTaskPlugin {
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames],
    },
  })
  cert!: CertInfo;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  @TaskInput({
    title: "UCloud授权",
    component: {
      name: "access-selector",
      type: "ucloud",
    },
    required: true,
  })
  accessId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "存储桶",
      helper: "要更新的UCloud存储桶",
      action: UCloudDeployToUS3.prototype.onGetBucketList.name,
    })
  )
  bucket!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "域名列表",
      helper: "要更新的UCloud域名列表",
      action: UCloudDeployToUS3.prototype.onGetDomainList.name,
    })
  )
  domainList!: string[];

  async onInstance() {}

  async execute(): Promise<void> {
    const access = await this.getAccess<UCloudAccess>(this.accessId);
    const certName = this.appendTimeSuffix("certd");
    let cert: CertInfo;

    for (const domain of this.domainList) {
      this.logger.info(`----------- 开始更新存储桶${this.bucket}的域名${domain}证书`);
      await this.deployToUS3({
        access: access,
        bucket: this.bucket,
        domain: domain,
        cert: cert,
        certName: certName,
      });
      this.logger.info(`----------- 更新存储桶${this.bucket}的域名${domain}证书成功`);
    }

    this.logger.info("部署完成");
  }

  async deployToUS3(req: { access: any; bucket: string; domain: string; cert: CertInfo; certName: string }) {
    const { access, bucket, domain, cert, certName } = req;

    const body: any = {
      Action: "UpdateUFileSSLCert",
      BucketName: bucket,
      Domain: domain,
      CertificateName: certName,
      Certificate: cert.crt,
      CertificateKey: cert.key,
    };

    this.logger.info(`----------- 更新对象存储SSL证书${bucket}:${domain}，${JSON.stringify(body)}`);
    const resp = await access.invoke(body);
    this.logger.info(`----------- 部署对象存储证书${bucket}:${domain}成功，${JSON.stringify(resp)}`);
  }

  async onGetBucketList(req: PageSearch = {}) {
    const access = await this.getAccess<UCloudAccess>(this.accessId);

    const pageNo = req.pageNo ?? 1;
    const pageSize = req.pageSize ?? 100;

    try {
      const resp = await access.invoke({
        Action: "DescribeBucket",
        ProjectId: access.projectId,
        Offset: (pageNo - 1) * pageSize,
        Limit: pageSize,
      });

      this.logger.info(`获取到存储桶列表:${JSON.stringify(resp)}`);

      const buckets = resp.DataSet || [];
      const total = buckets.length;

      if (!buckets || buckets.length === 0) {
        throw new Error("没有找到存储桶，请先在控制台创建存储桶");
      }

      const options = buckets.map((item: any) => {
        return {
          label: `${item.BucketName}<${item.Region}>`,
          value: `${item.BucketName}`,
          bucket: item.BucketName,
        };
      });

      return {
        list: this.ctx.utils.options.buildGroupOptions(options, this.certDomains),
        total: total,
        pageNo: pageNo,
        pageSize: pageSize,
      };
    } catch (err) {
      this.logger.error(`获取存储桶列表失败:${err}`);
      throw err;
    }
  }

  async onGetDomainList(req: PageSearch = {}) {
    const access = await this.getAccess<UCloudAccess>(this.accessId);

    if (!this.bucket) {
      throw new Error("请先选择存储桶");
    }

    try {
      const resp = await access.invoke({
        Action: "DescribeBucket",
        ProjectId: access.projectId,
        BucketName: this.bucket,
      });

      this.logger.info(`获取到存储桶域名列表:${JSON.stringify(resp)}`);

      const buckets = resp.DataSet || [];
      if (!buckets || buckets.length === 0) {
        throw new Error(`没有找到存储桶${this.bucket}`);
      }

      const bucketInfo = buckets[0];
      const domainSet = bucketInfo.Domain || {};

      const allDomains = [...(domainSet.Src || []), ...(domainSet.Cdn || []), ...(domainSet.CustomSrc || []), ...(domainSet.CustomCdn || [])];

      if (!allDomains || allDomains.length === 0) {
        throw new Error(`没有找到存储桶${this.bucket}的域名，请先在控制台为存储桶添加域名`);
      }

      const options = allDomains.map((domain: string) => {
        return {
          label: domain,
          value: domain,
          domain: domain,
        };
      });

      return {
        list: this.ctx.utils.options.buildGroupOptions(options, this.certDomains),
        total: allDomains.length,
        pageNo: 1,
        pageSize: allDomains.length,
      };
    } catch (err) {
      this.logger.error(`获取存储桶域名列表失败:${err}`);
      throw err;
    }
  }
}

new UCloudDeployToUS3();
