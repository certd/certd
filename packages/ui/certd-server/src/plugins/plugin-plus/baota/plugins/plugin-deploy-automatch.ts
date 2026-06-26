import { HttpClient } from "@certd/basic";
import { CertTargetItem, IsTaskPlugin, PageSearch, pluginGroups, RunStrategy, TaskInput, TaskOutput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { createCertDomainGetterInputDefine } from "@certd/plugin-lib";
import { AbstractPlusTaskPlugin } from "@certd/plugin-plus";
import { BaotaAccess } from "../access.js";
import { BaotaClient } from "../lib/client.js";

/**
 * 宝塔-全自动部署插件
 * 根据证书域名自动匹配宝塔站点，全自动部署SSL证书
 * 参照阿里云DCDN部署插件的"根据证书匹配"模式实现
 */
@IsTaskPlugin({
  name: "BaotaAutoDeploySiteCert",
  title: "宝塔-全自动部署",
  icon: "svg:icon-bt",
  group: pluginGroups.panel.key,
  desc: "根据证书域名自动匹配宝塔站点，全自动部署SSL证书。新增加速域名自动感知，自动新增部署",
  runStrategy: RunStrategy.AlwaysRun,
  needPlus: true,
})
export class BaotaAutoDeploySiteCert extends AbstractPlusTaskPlugin {
  /** 域名证书 */
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

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  /** 宝塔授权 */
  @TaskInput({
    title: "宝塔授权",
    helper: "将自动查找证书匹配的站点，检查证书即将过期的站点并更新",
    component: {
      name: "access-selector",
      type: "baota",
    },
    required: true,
  })
  accessId!: string;

  /** 输出：已部署过的站点列表 */
  @TaskOutput({
    title: "已部署过的站点",
  })
  deployedList!: string[];

  async onInstance() {}

  async execute(): Promise<any> {
    this.logger.info(`开始宝塔全自动部署证书: ${this.certDomains.join(",")}`);
    const access = await this.getAccess<BaotaAccess>(this.accessId);
    const http: HttpClient = this.ctx.http;
    const client = new BaotaClient(access, http);

    // 宝塔并发部署会导致nginx的conf错乱，用锁串行化
    const lockKey = `baota-lock-${this.accessId}`;

    const { result, deployedList } = await this.autoMatchedDeploy({
      targetName: "宝塔站点",
      // 1. 获取证书域名列表
      getCertDomains: async () => {
        return this.certDomains;
      },
      // 上传证书（宝塔不需要预上传，直接传入key/crt部署）
      uploadCert: async () => {
        return { key: this.cert.key, crt: this.cert.crt };
      },
      // 4. 部署证书到匹配的站点
      deployOne: async (req: { target: CertTargetItem; cert: any }) => {
        await this.ctx.utils.locker.execute(lockKey, async () => {
          this.logger.info(`为站点: ${req.target.label} 设置证书`);
          const res = await client.doRequest("/site", "SetSSL", {
            type: 0,
            siteName: req.target.value,
            key: req.cert.key,
            csr: req.cert.crt,
          });
          this.logger.info(res?.msg || `站点 ${req.target.label} 部署证书成功`);
        });
      },
      // 2. 获取待部署证书目标列表
      getDeployTargetList: async (data: PageSearch) => {
        return await this.querySiteList(client);
      },
    });

    this.deployedList = deployedList;
    return result;
  }

  /**
   * 从宝塔查询站点列表，按证书域名匹配分组
   */
  private async querySiteList(client: BaotaClient): Promise<{ list: CertTargetItem[]; total: number }> {
    const domains = this.certDomains;
    const url = "/ssl?action=GetSiteDomain";
    const data = {
      cert_list: JSON.stringify(domains),
    };
    const res = await client.doRequest(url, null, data, { skipCheckRes: false });
    this.logger.info(`获取到站点数量: ${res?.total ?? res?.all?.length ?? 0}`);
    const all: string[] = res.all || [];
    const options: CertTargetItem[] = all.map((item: string) => ({
      value: item,
      label: item,
      domain: item,
    }));
    return {
      list: options,
      total: options.length,
    };
  }
}
new BaotaAutoDeploySiteCert();