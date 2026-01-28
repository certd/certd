import { AbstractTaskPlugin, IsTaskPlugin, PageSearch, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { UCloudAccess } from "../access.js";
import { UCloudRegions } from "./constants.js";

@IsTaskPlugin({
  name: "UCloudDeployToULB",
  title: "UCloud-部署到负载均衡",
  desc: "将证书部署到UCloud负载均衡(ULB/ALB/CLB)",
  icon: "svg:icon-ucloud",
  group: pluginGroups.ucloud.key,
  needPlus: false,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed
    }
  }
})
export class UCloudDeployToULB extends AbstractTaskPlugin {
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames]
    }
  })
  cert!: CertInfo;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  @TaskInput({
    title: "UCloud授权",
    component: {
      name: "access-selector",
      type: "ucloud"
    },
    required: true
  })
  accessId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "地域",
      helper: "选择UCloud地域",
      action: UCloudDeployToULB.prototype.onGetRegionList.name,
      multi: false
    })
  )
  region!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "证书列表",
      helper: "选择要替换的证书名称\n如果证书不存在，可以手动输入证书名称（运行一次后将会自动创建,您可以在ULB控制台进行使用）\n请确保证书名称不要重复，如果重复，只会更新创建时间最近的那一条",
      action: UCloudDeployToULB.prototype.onGetCertList.name,
    })
  )
  certNameList!: string[];


  async onInstance() {
  }

  async onGetRegionList(req: PageSearch = {}) {
    const access = await this.getAccess<UCloudAccess>(this.accessId);

    const res = await access.GetRegion();
    let list = res.Regions || [];

    if (!list || list.length === 0) {
      throw new Error("没有获取到UCloud地域列表");
    }

    const haveSet = {}
    list = list.filter((item: any) => {
      const region = item.Region;
      if (haveSet[region]) {
        return false;
      }
      haveSet[region] = true;
      return true;
    })
    let options = list.map((item: any) => {
      const region = item.Region;
      const name = UCloudRegions.find((r) => r.value === region)?.label || item.RegionName;
      return {
        label: `${name}(${item.Region})`,
        value: item.Region
      };
    });

    return {
      list: options,
      total: options.length,
      pageNo: 1,
      pageSize: options.length
    };
  }


  async execute(): Promise<void> {
    const access = await this.getAccess<UCloudAccess>(this.accessId);
    const allCertList = await this.getAllCert(access);
    const certMap = {}
    allCertList.forEach((item) => {
      if (!item.name) {
        return;
      }
      certMap[item.name] = item;
    })

    for (const certName of this.certNameList) {
      this.logger.info(`----------- 开始更新证书：${certName}`);
      const oldCert = certMap[certName];
      if (!oldCert) {
        //如果没有找到旧证书，则跳过
        this.logger.info(`没有找到ULB证书${certName}，仅上传证书，不更新`);
        await this.uploadCertToULB({
          access,
          certName: `${certName}`,
        });
        this.logger.info(`----------- 上传证书${certName}完成`);
        continue;
      }

      const bakCertName = `${certName}_${oldCert.id}_${Date.now()}`
      let certId = await this.uploadCertToULB({
        access,
        certName:bakCertName,
      });
      this.logger.info(`----------- 上传证书${bakCertName}完成`);

      await this.updateSSLBinding({
        access,
        oldSSL: oldCert,
        newSSLId: certId,
        certName,
      });
      this.logger.info(`----------- 证书${certName}部署完成`);

    }

    await this.ctx.utils.sleep(2000);
    this.logger.info(`----------- 开始清理过期证书`);
    await this.clearExpiredCert(access, allCertList);
    this.logger.info(`----------- 清理过期证书完成`);
    this.logger.info("部署完成");
  }

  async clearExpiredCert(access: UCloudAccess, allCertList: any[]) {
    const now = Date.now()/1000;
    const expiredCertList = allCertList.filter((item) => {
      if (!item.notAfter) {
        return false;
      }
      return item.notAfter < now;
    })
    if (!expiredCertList || expiredCertList.length === 0) {
      this.logger.info(`----------- 没有过期证书需要清理`);
      return;
    }
    for (const cert of expiredCertList) {
      this.logger.info(`----------- 清理过期证书：${cert.name} ${cert.id}`);
      try {
        await access.invoke({
          "Action": "DeleteSSL",
          "Region": this.region,
          "ProjectId": access.projectId,
          "SSLId": cert.id,
        });
        this.logger.info(`----------- 清理过期证书成功：${cert.name} ${cert.id}`);
      } catch (error) {
        this.logger.error(`----------- 清理过期证书失败：${cert.name} ${cert.id}`, error);
      }
    }
  }
  async updateSSLBinding(req: {
    access: UCloudAccess,
    oldSSL: any,
    newSSLId: string,
    certName: string,
  }) {
    const access = req.access;
    const oldSSLId = req.oldSSL.id;
    const newSSLId = req.newSSLId;

    if (!req.oldSSL.relations || req.oldSSL.relations.length === 0) {
      this.logger.info(`----------- 证书${req.oldSSL.name} ${req.oldSSL.id} 没有绑定ULB，无需更新绑定`);
    } else {
      this.logger.info(`----------- 更新ULB证书绑定：${oldSSLId} -> ${newSSLId}`);
      await access.invoke({
        "Action": "UpdateSSLBinding",
        "Region": this.region,
        "ProjectId": access.projectId,
        "OldSSLId": oldSSLId,
        "NewSSLId": newSSLId,
      });
      this.logger.info(`----------- 更新ULB证书绑定成功: ${newSSLId}`);
    }

    // 更新证书名称
    this.logger.info(`----------- 更新ULB证书名称：${newSSLId} -> ${req.certName}`);
    await access.invoke({
      "Action": "UpdateSSLAttribute",
      "Region": this.region,
      "ProjectId": access.projectId,
      "SSLId": newSSLId,
      "SSLName": req.certName,
    });
    this.logger.info(`----------- 更新ULB证书名称成功：${req.certName}`);
    await this.ctx.utils.sleep(5000);
    try {
      this.logger.info(`----------- 删除ULB旧证书：${oldSSLId}`);
      await access.invoke({
        "Action": "DeleteSSL",
        "Region": this.region,
        "ProjectId": access.projectId,
        "SSLId": oldSSLId,
      });
      this.logger.info(`----------- 删除ULB旧证书成功：${oldSSLId}`);
    } catch (error) {
      this.logger.error(`----------- 删除ULB旧证书失败：${oldSSLId}`, error);
    }

  }

  async uploadCertToULB(req: {
    access: UCloudAccess,
    certName: string,
  }) {
    const access = req.access;
    const certName = req.certName;
    const certContent = `${this.cert.crt}\n${this.cert.key}`
    const res = await access.invoke({
      "Action": "CreateSSL",
      "Region": this.region,
      "ProjectId": access.projectId,
      "SSLName": certName,
      "SSLContent": certContent,
    });

    if (res.RetCode !== 0) {
      throw new Error(`创建ULB证书失败: ${res.Message || '未知错误'}`);
    }

    return res.SSLId;
  }


  async getAllCert(access: UCloudAccess) {
    const certList = [] as any[];
    const pager = {
      pageNo: 1,
      pageSize: 100,
    };
    while (true) {
      const { list, total } = await this.getCertPage(access, pager);
      certList.push(...list);
      if (certList.length >= total) {
        break;
      }
      pager.pageNo++;
    }
    // this.logger.info(`----------- certList----------:\n`, certList);
    return certList;
  }


  async getCertPage(access: UCloudAccess, req: PageSearch = {}) {
    const pageNo = req.pageNo ?? 1;
    const pageSize = req.pageSize ?? 100;

    const res = await access.invoke({
      "Action": "DescribeSSLV2",
      "Region": this.region,
      "ProjectId": access.projectId,
      "Offset": (pageNo - 1) * pageSize,
      "Limit": pageSize
    });

    let list = res.DataSet || [];
    const total = res.TotalCount || list.length;

    list = list.map((item: any) => {
      const domains = [
        ...item.Domains.split(','),
        ...item.DNSNames.split(',')
      ]
      return {
        id: item.SSLId,
        name: item.SSLName,
        domain: domains,
        notAfter: item.NotAfter,
        notBefore: item.NotBefore,
        createTime: item.CreateTime,
        relations: item.Relations,
      };
    })
    return {
      list: list,
      total: total,
    };
  }

  async onGetCertList(req: PageSearch = {}) {
    const access = await this.getAccess<UCloudAccess>(this.accessId);

    const { list, total } = await this.getCertPage(access, req);

    if (!list || list.length === 0) {
      throw new Error("没有找到ULB证书，请先在控制台创建ULB证书");
    }

    const options = list.map((item: any) => {
      return {
        label: `${item.name}<${item.id}>`,
        value: `${item.name}`,
        domain: item.domain,
      };
    });

    return {
      list: options,
      total: total,
    };
  }

}

new UCloudDeployToULB();
