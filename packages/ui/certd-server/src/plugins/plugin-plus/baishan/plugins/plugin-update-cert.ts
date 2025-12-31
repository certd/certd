import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { BaishanAccess } from "../access.js";

@IsTaskPlugin({
  name: "BaishanUpdateCert",
  title: "白山云-更新证书",
  icon: "material-symbols:shield-outline",
  group: pluginGroups.cdn.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
  needPlus: false,
})
export class BaishanUpdateCert extends AbstractTaskPlugin {
  //测试参数
  @TaskInput({
    title: "证书ID",
    component: {
      name: "a-input-number",
      vModel: "value",
    },
    helper: "证书ID,在证书管理页面查看，每条记录都有证书id",
  })
  certId!: number;

  //测试参数
  @TaskInput({
    title: "证书名称",
    component: {
      name: "a-input",
      vModel: "value",
    },
    helper: "给证书设置一个名字，便于区分",
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
    title: "白山云授权",
    helper: "白山云授权",
    component: {
      name: "access-selector",
      type: "baishan",
    },
    required: true,
  })
  accessId!: string;

  async onInstance() {}

  async execute(): Promise<void> {
    const access = await this.getAccess<BaishanAccess>(this.accessId);
    // https://cdn.api.baishan.com/v2/domain/certificate
    try {
      const res = await this.ctx.http.request({
        url: "/v2/domain/certificate?token=" + access.token,
        baseURL: "https://cdn.api.baishan.com",
        method: "post",
        data: {
          cert_id: this.certId,
          name: this.certName,
          certificate: this.cert.crt,
          key: this.cert.key,
        },
      });

      if (res.code !== 0) {
        throw new Error("修改证书失败：" + res.message || res.msg || JSON.stringify(res));
      }
    } catch (e: any) {
      if (e.message?.indexOf("this certificate is exists") > -1) {
        // this certificate is exists, cert_id is (224995)
        //提取id
        const id = e.message.match(/\d+/);
        if (id && id.length > 0 && id[0] !== this.certId + "") {
          throw new Error("证书已存在，但证书id不一致，当前证书id为" + this.certId + "，已存在证书id为" + id);
        }
        this.logger.info("证书已存在，无需更新");
        return;
      }
      throw e;
    }

    this.logger.info("证书更新成功");
  }
}

new BaishanUpdateCert();
