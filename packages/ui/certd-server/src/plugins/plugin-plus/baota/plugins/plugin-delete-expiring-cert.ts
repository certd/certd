import { IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { BaotaClient } from "../lib/client.js";
import { AbstractPlusTaskPlugin } from "@certd/plugin-plus";
import dayjs from "dayjs";
@IsTaskPlugin({
  name: "BaotaDeleteExpiringCert",
  title: "宝塔-删除过期证书",
  icon: "svg:icon-bt",
  group: pluginGroups.panel.key,
  desc: "删除证书夹中过期证书",
  showRunStrategy: true,
  default: {
    strategy: {
      runStrategy: RunStrategy.AlwaysRun,
    },
  },
  needPlus: true,
})
export class BaotaDeleteExpiringCert extends AbstractPlusTaskPlugin {
  //授权选择框
  @TaskInput({
    title: "宝塔授权",
    helper: "baota的接口密钥",
    component: {
      name: "access-selector",
      type: "baota",
    },
    required: true,
  })
  accessId!: string;

  async onInstance() {}
  async execute(): Promise<void> {
    const { accessId } = this;
    const access = await this.getAccess(accessId);
    const http = this.ctx.http;
    const client = new BaotaClient(access, http);

    //https://baota.docmirror.cn:20001/ssl?action=get_cert_list
    const res = await client.doRequest("/ssl", "get_cert_list", null);

    const now = new Date().getTime();
    for (const item of res) {
      if (dayjs(item.not_after).valueOf() < now) {
        //https://baota.docmirror.cn:20001/ssl?action=remove_cloud_cert
        /**
         * local: 1
         * ssl_hash: fbe087d5253b78ba37264486415181ab
         */
        this.logger.info(`证书: ${item.name} 过期时间: ${item.not_after}，已过期，删除`);
        try {
          await client.doRequest("/ssl", "remove_cloud_cert", {
            local: 1,
            ssl_hash: item.hash,
          });
        } catch (e) {
          this.logger.error(`删除证书: ${item.name} 失败`, e);
        }

        await this.ctx.utils.sleep(1000);
      } else {
        this.logger.info(`证书: ${item.name} 过期时间: ${item.not_after}，未过期`);
      }
    }

    this.logger.info(res?.msg);
  }
}
new BaotaDeleteExpiringCert();
