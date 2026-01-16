import { IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { LuckyAccess } from "../access.js";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { AbstractPlusTaskPlugin } from "@certd/plugin-plus";
import { isArray } from "lodash-es";

@IsTaskPlugin({
  //命名规范，插件类型+功能（就是目录plugin-demo中的demo），大写字母开头，驼峰命名
  name: "LuckyUpdateCert",
  title: "lucky-更新Lucky证书",
  icon: "svg:icon-lucky",
  //插件分组
  group: pluginGroups.panel.key,
  needPlus: true,
  default: {
    //默认值配置照抄即可
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
//类名规范，跟上面插件名称（name）一致
export class LuckyUpdateCert extends AbstractPlusTaskPlugin {
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
    title: "Lucky授权",
    component: {
      name: "access-selector",
      type: "lucky", //固定授权类型
    },
    required: true, //必填
  })
  accessId!: string;
  //

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "Lucky证书",
      helper: "要更新的Lucky证书",
      typeName: "LuckyUpdateCert",
      action: LuckyUpdateCert.prototype.onGetCertList.name,
      watches: ["accessId"],
    })
  )
  certList!: string[];

  //插件实例化时执行的方法
  async onInstance() {}

  //插件执行方法
  async execute(): Promise<void> {
    const { cert } = this;

    const access: LuckyAccess = await this.getAccess<LuckyAccess>(this.accessId);
    const list = await this.onGetCertList();

    const certMap: any = {};
    list.forEach(item => {
      certMap[item.value] = item.item;
    });

    for (const item of this.certList) {
      this.logger.info(`开始更新证书：${item}`);
      const old = certMap[item];
      if (!old) {
        throw new Error(`没有找到证书：Key=${item},请确认该证书是否存在`);
      }
      const remark = old.Remark;
      const res = await this.doRequest({
        access,
        urlPath: "/api/ssl",
        method: "PUT",
        data: {
          AddFrom: "file",
          CertBase64: this.ctx.utils.hash.base64(cert.crt),
          Enable: true,
          Key: item,
          MappingChangeScript: "",
          MappingPath: "",
          MappingToPath: false,
          KeyBase64: this.ctx.utils.hash.base64(cert.key),
          IssuerCertificate: "",
          ExtParams: {},
          Remark: remark,
        },
      });

      this.logger.info(`更新成功：${JSON.stringify(res)}`);
    }

    this.logger.info("部署成功");
  }

  async doRequest(req: { access: LuckyAccess; urlPath: string; data: any; method?: string }) {
    const { access, urlPath, data, method } = req;
    let url = `${access.url}/${access.safePath || ""}${urlPath}?_=${Math.floor(new Date().getTime())}`;
    // 从第7个字符起，将//替换成/
    const protocol = url.substring(0, 7);
    let suffix = url.substring(7);
    suffix = suffix.replaceAll("//", "/");
    suffix = suffix.replaceAll("//", "/");
    url = protocol + suffix;

    const headers: any = {
      // Origin: access.url,
      "Content-Type": "application/json",
      // "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.95 Safari/537.36",
    };
    headers["openToken"] = access.openToken;
    const res = await this.http.request({
      method: method || "POST",
      url,
      data,
      headers,
      skipSslVerify: true,
    });
    if (res.ret !== 0) {
      throw new Error(`请求失败:${res.msg}`);
    }
    return res;
  }

  async onGetCertList() {
    const access: LuckyAccess = await this.getAccess<LuckyAccess>(this.accessId);
    const res = await this.doRequest({
      access,
      urlPath: "/api/ssl",
      data: {},
      method: "GET",
    });
    const list = res.list;
    if (!list || list.length === 0) {
      throw new Error("没有找到证书，请先在SSL/TLS证书页面中手动上传一次证书");
    }

    const options = list.map((item: any) => {
      const certsInfo = item.CertsInfo;
      let label = "";
      if (isArray(certsInfo)) {
        label = item.CertsInfo[0].Domains;
      } else {
        label = item.CertsInfo.Domains[0];
      }
      return {
        label: `${item.Remark}<${label}>`,
        value: item.Key,
        item: item,
      };
    });
    return this.ctx.utils.options.buildGroupOptions(options, this.certDomains);
  }
}
//实例化一下，注册插件
new LuckyUpdateCert();
