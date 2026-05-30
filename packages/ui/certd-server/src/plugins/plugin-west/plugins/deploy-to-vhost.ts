import { AbstractTaskPlugin, IsTaskPlugin, PageSearch, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { WestAccess } from "../access.js";

@IsTaskPlugin({
  //命名规范，插件类型+功能（就是目录plugin-demo中的demo），大写字母开头，驼峰命名
  name: "WestDeployToVhost",
  title: "西数-部署到虚拟主机",
  desc: "西部数码部署证书到虚拟主机",
  icon: "svg:icon-lucky",
  //插件分组
  group: pluginGroups.cdn.key,
  needPlus: false,
  default: {
    //默认值配置照抄即可
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
//类名规范，跟上面插件名称（name）一致
export class WestDeployToVhost extends AbstractTaskPlugin {
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
    title: "西数授权",
    component: {
      name: "access-selector",
      type: "west", //固定授权类型
    },
    required: true, //必填
  })
  accessId!: string;
  //

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "虚拟主机列表",
      helper: "虚拟主机列表",
      action: WestDeployToVhost.prototype.onGetVhostList.name,
      pager: false,
      search: false,
    })
  )
  vhostList!: string[];

  // @TaskInput(
  //   createRemoteSelectInputDefine({
  //     title: "证书Id",
  //     helper: "要部署的西数证书id",
  //     action: WestDeployToVhost.prototype.onGetCertList.name,
  //     pager: false,
  //     search: false
  //   })
  // )
  // certList!: string[];

  //插件实例化时执行的方法
  async onInstance() {}

  //插件执行方法
  async execute(): Promise<void> {
    const access = await this.getAccess<WestAccess>(this.accessId);

    for (const item of this.vhostList) {
      this.logger.info(`----------- 开始更新证书到虚拟主机：${item}`);
      const arr = item.split("_");
      const sitename = arr[1];
      await this.uploadCert({ access, sitename });
      await this.ctx.utils.sleep(2000);
      const res = await this.getVhostSslInfo({ access, sitename });
      this.logger.info(`----------- 虚拟主机${sitename}证书信息：${JSON.stringify(res)}`);
      this.logger.info(`----------- 更新证书${item}成功`);
    }

    this.logger.info("部署完成");
  }

  // async onGetCertList(data: PageSearch = {}) {
  //   const access = await this.getAccess<WestAccess>(this.accessId);

  //   const list = await access.getCertList({});
  //   if (!list || list.length === 0) {
  //     throw new Error("没有找到证书，请先在控制台上传一次证书且关联域名");
  //   }

  //   /**
  //    * certificate-id
  //    * name
  //    * dns-names
  //    */
  //   const options = list.map((item: any) => {
  //     const domains = item["dns-names"]
  //     const certId = item["certificate-id"];
  //     return {
  //       label: `${item.name}<${certId}-${domains[0]}>`,
  //       value: certId,
  //       domain: item["dns-names"]
  //     };
  //   });
  //   return {
  //     list: this.ctx.utils.options.buildGroupOptions(options, this.certDomains),
  //     total: list.length,
  //     pageNo: 1,
  //     pageSize: list.length
  //   };
  // }

  async uploadCert(req: { access: any; sitename: string }) {
    const { access, sitename } = req;
    const data = {
      /**
         * act
vhostssl
是
String
sitename
westly
是
String
cmd
import
是
String
openssl/closessl 部署/关闭
keycontent
是
String
私匙
certcontent
         */
      act: "vhostssl",
      sitename: sitename,
      westly: "1",
      cmd: "import",
      opensslclosessl: "openssl",
      keycontent: this.cert.key,
      certcontent: this.cert.crt,
    };

    const res = await access.doRequest({
      url: `/v2/vhost/`,
      method: "POST",
      data: data,
    });
    return res;
  }

  async getVhostSslInfo(req: { access: any; sitename: string }) {
    const { access, sitename } = req;
    const data = {
      act: "vhostssl",
      sitename: sitename,
      cmd: "info",
    };
    const res = await access.doRequest({
      url: `/v2/vhost/`,
      method: "POST",
      data: data,
    });
    return res;
  }

  async onGetVhostList(data: PageSearch = {}) {
    const access = await this.getAccess<WestAccess>(this.accessId);

    const res = await access.doRequest({
      url: `/v2/vhost/`,
      method: "POST",
      data: {
        act: "sync",
        westid: 1,
      },
    });
    const list = res.data;
    if (!list || list.length === 0) {
      throw new Error("没有找到虚拟主机");
    }

    /**
     * certificate-id
     * name
     * dns-names
     */
    const options = list.map((item: any) => {
      return {
        label: `${item.sitename}<${item.westid}-${item.bindings}>`,
        value: `${item.westid}_${item.sitename}`,
        domain: item.bindings.split(","),
      };
    });
    return {
      list: this.ctx.utils.options.buildGroupOptions(options, this.certDomains),
      total: list.length,
      pageNo: 1,
      pageSize: list.length,
    };
  }
}

//实例化一下，注册插件
new WestDeployToVhost();
