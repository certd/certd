import { IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { AbstractPlusTaskPlugin } from "@certd/plugin-plus";
import { MaoyunAccess } from "../access.js";
import { MaoyunClient } from "../client.js";

@IsTaskPlugin({
  //命名规范，插件类型+功能（就是目录plugin-demo中的demo），大写字母开头，驼峰命名
  name: "MaoyunDeployToCdn",
  title: "Maoyun-更新猫云CDN证书",
  icon: "svg:icon-lucky",
  //插件分组
  group: pluginGroups.cdn.key,
  needPlus: true,
  default: {
    //默认值配置照抄即可
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
//类名规范，跟上面插件名称（name）一致
export class MaoyunDeployToCdn extends AbstractPlusTaskPlugin {
  //证书选择，此项必须要有
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames],
    },
    // required: true, // 必填
  })
  cert!: CertInfo;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  //授权选择框
  @TaskInput({
    title: "Maoyun授权",
    component: {
      name: "access-selector",
      type: "maoyun", //固定授权类型
    },
    required: true, //必填
  })
  accessId!: string;
  //

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "CDN加速域名",
      helper: "要部署证书的域名",
      action: MaoyunDeployToCdn.prototype.onGetDomainList.name,
      watches: ["accessId"],
    })
  )
  domainList!: string[];

  //插件实例化时执行的方法
  async onInstance() {}

  //插件执行方法
  async execute(): Promise<void> {
    const { cert } = this;

    const access: MaoyunAccess = await this.getAccess<MaoyunAccess>(this.accessId);

    const client = new MaoyunClient({
      http: this.ctx.http,
      logger: this.logger,
      access,
    });
    await client.login();
    for (const item of this.domainList) {
      this.logger.info(`开始更新证书：${item}`);

      // https://testaa.5678.jp/cdn/domain/6219/https_conf
      /**
       * {status: 1, new_certificate: {name: "certd",…}}
       * new_certificate
       * :
       * {name: "certd",…}
       * content
       * :
       * name
       * :
       * "certd"
       * private_key
       * :
       * status
       * :
       * 1
       */
      await client.doRequest({
        method: "PUT",
        url: `/cdn/domain/${item}/https_conf`,
        data: {
          status: 1,
          new_certificate: {
            name: this.appendTimeSuffix("certd"),
            content: cert.crt,
            private_key: cert.key,
          },
        },
      });

      this.logger.info(`部署${item}证书成功`);
    }

    this.logger.info("部署完成");
  }

  async onGetDomainList() {
    const access: MaoyunAccess = await this.getAccess<MaoyunAccess>(this.accessId);
    const client = new MaoyunClient({
      http: this.ctx.http,
      logger: this.logger,
      access,
    });
    await client.login();
    const res = await client.doRequest({
      url: "/cdn/domain",
      data: {},
      params: {
        channel_type: "0,1,2",
        page: 1,
        page_size: 1000,
      },
      method: "GET",
    });
    const list = res.data;
    if (!list || list.length === 0) {
      throw new Error("没有找到加速域名，请先在控制台添加加速域名");
    }

    const options = list.map((item: any) => {
      return {
        label: `${item.domain}<${item.id}>`,
        value: item.id,
        domain: item.domain,
      };
    });
    return this.ctx.utils.options.buildGroupOptions(options, this.certDomains);
  }
}
//实例化一下，注册插件
new MaoyunDeployToCdn();
