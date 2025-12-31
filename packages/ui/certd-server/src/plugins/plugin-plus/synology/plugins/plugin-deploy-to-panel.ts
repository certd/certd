import { IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertInfo, CertReader } from "@certd/plugin-cert";
import { AbstractPlusTaskPlugin } from "@certd/plugin-lib";
import { SynologyClient } from "../client.js";
import fs from "fs";
import FormData from "form-data";
import { SynologyAccess } from "../access.js";
import { CertApplyPluginNames } from "@certd/plugin-cert";
@IsTaskPlugin({
  name: "SynologyDeployToPanel",
  title: "群晖-部署证书到群晖面板",
  icon: "simple-icons:synology",
  group: pluginGroups.panel.key,
  desc: "Synology，支持6.x以上版本",
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
  needPlus: true,
})
export class SynologyDeployToPanel extends AbstractPlusTaskPlugin {
  //测试参数
  @TaskInput({
    title: "群晖证书描述",
    component: {
      name: "a-input",
      vModel: "value",
      placeholder: "群晖证书描述",
    },
    required: false,
    helper: "在群晖证书管理页面里面，选择证书，点击操作，给证书设置描述，然后填写到这里\n如果不填，则覆盖更新全部证书",
  })
  certName!: string;

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
    title: "群晖授权",
    helper: "群晖登录授权，请确保账户是管理员用户组",
    component: {
      name: "access-selector",
      type: "synology",
    },
    required: true,
  })
  accessId!: string;

  async onInstance() {}
  async execute(): Promise<void> {
    const access: SynologyAccess = await this.getAccess<SynologyAccess>(this.accessId);
    const client = new SynologyClient(access, this.ctx.http, this.ctx.logger, access.skipSslVerify);
    // await client.init();
    await client.doLogin();
    // const res = await client.getInfo();
    // this.logger.info(res);
    const certListRes = await client.getCertList();
    if (this.certName) {
      const certItem = certListRes.certificates.find((item: any) => {
        return item.desc === this.certName || item.subject.common_name === this.certName;
      });
      if (!certItem) {
        throw new Error(`未找到证书: ${this.certName}`);
      }
      this.logger.info(`找到证书: ${certItem.id}`);
      await this.updateCertToPanel(client, certItem);
    } else {
      this.logger.info("开始更新全部证书");
      for (const item of certListRes.certificates) {
        this.logger.info(`更新证书: ${item.id}`);
        await this.updateCertToPanel(client, item);
      }
    }
  }

  async updateCertToPanel(client: SynologyClient, certItem: any) {
    /**
     * query
     *  api: SYNO.Core.Certificate
     *     method: import
     *       version: 1
     *     SynoToken: Bvum9p7BNeSc6
     *
     * key: （二进制）
     * cert: （二进制）
     * inter_cert: （二进制）
     * id: yxTtcC
     * desc: certd
     * as_default:
     */
    this.logger.info(`更新证书:${certItem.id}`);
    const certReader = new CertReader(this.cert);

    return certReader.readCertFile({
      logger: this.logger,
      handle: async (ctx) => {
        const form = new FormData();
        const { tmpCrtPath, tmpKeyPath, tmpIcPath } = ctx;
        this.logger.info(`上传证书:${tmpCrtPath},${tmpKeyPath}`);
        form.append("key", fs.createReadStream(tmpKeyPath));
        form.append("cert", fs.createReadStream(tmpCrtPath));
        if (certReader.cert.ic) {
          this.logger.info(`包含中间证书:${tmpIcPath}`);
          form.append("inter_cert", fs.createReadStream(tmpIcPath));
        }
        form.append("id", certItem.id);
        form.append("desc", certItem.desc);
        // form传输必须是string，bool要改成string
        // form.append("as_default", certItem.is_default + "");

        console.log(JSON.stringify(form.getHeaders()));
        return await client.doRequest({
          method: "POST",
          apiParams: {
            api: "SYNO.Core.Certificate",
            version: 1,
            method: "import",
          },
          data: form,
          headers: {
            ...form.getHeaders(),
          },
        });
      },
    });
  }
}
new SynologyDeployToPanel();
