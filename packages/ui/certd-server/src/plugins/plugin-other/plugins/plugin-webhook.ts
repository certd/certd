import qs from "qs";
import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo, CertReader } from "@certd/plugin-cert";

@IsTaskPlugin({
  name: "WebhookDeployCert",
  title: "webhook方式部署证书",
  icon: "ion:send-sharp",
  desc: "调用webhook部署证书",
  group: pluginGroups.other.key,
  showRunStrategy: false,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class WebhookDeployCert extends AbstractTaskPlugin {
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

  @TaskInput({
    title: "webhook地址",
    component: {
      placeholder: "https://xxxxx.com/xxxx",
    },
    col: {
      span: 24,
    },
    required: true,
  })
  webhook = "";

  @TaskInput({
    title: "请求方式",
    value: "POST",
    component: {
      name: "a-select",
      placeholder: "post/put/get",
      options: [
        { value: "POST", label: "POST" },
        { value: "PUT", label: "PUT" },
        { value: "GET", label: "GET" },
      ],
    },
    required: true,
  })
  method = "";

  @TaskInput({
    title: "ContentType",
    value: "application/json",
    component: {
      name: "a-auto-complete",
      options: [
        { value: "application/json", label: "application/json" },
        { value: "application/x-www-form-urlencoded", label: "application/x-www-form-urlencoded" },
      ],
    },
    helper: "也可以自定义填写",
    required: true,
  })
  contentType = "";

  @TaskInput({
    title: "Headers",
    component: {
      name: "a-textarea",
      vModel: "value",
      rows: 2,
    },
    col: {
      span: 24,
    },
    helper: "一行一个，格式为key=value",
    required: false,
  })
  headers = "";

  @TaskInput({
    title: "消息body模版",
    value: `{
    "id":"123",
    "crt":"\${crt}",
    "key":"\${key}"
}`,
    component: {
      name: "a-textarea",
      rows: 4,
    },
    col: {
      span: 24,
    },
    helper: `根据对应的webhook接口文档，构建一个json对象作为参数（默认值只是一个示例，一般不是正确的参数）
变量用\${}包裹\n字符串需要双引号，使用\\n换行
如果是get方式，将作为query参数拼接到url上
变量列表：\${domain} 主域名、\${domains} 全部域名、\${crt} 证书、\${key} 私钥、\${ic} 中间证书、\${one} 一体证书、\${der} der证书(base64)、\${pfx} pfx证书(base64)、\${jks} jks证书(base64)、`,
    required: true,
  })
  template = "";

  @TaskInput({
    title: "忽略证书校验",
    value: false,
    component: {
      name: "a-switch",
      vModel: "checked",
    },
    required: false,
  })
  skipSslVerify: boolean;

  @TaskInput({
    title: "成功判定",
    helper: "返回结果中包含此字符串则表示部署成功，不填则仅通过statusCode判定",
    component: {
      name: "a-input",
      placeholder: '例如： status:"success"',
    },
  })
  successStr = "";

  replaceTemplate(target: string, body: any, urlEncode = false) {
    let bodyStr = target;
    const keys = Object.keys(body);
    for (const key of keys) {
      let value = urlEncode ? encodeURIComponent(body[key]) : body[key];
      value = value.replaceAll(`\n`, "\\n");
      bodyStr = bodyStr.replaceAll(`\${${key}}`, value);
    }
    return bodyStr;
  }

  async send() {
    if (!this.template) {
      throw new Error("模版不能为空");
    }
    if (!this.webhook) {
      throw new Error("webhook不能为空");
    }

    const certReader = new CertReader(this.cert);

    const replaceBody = {
      domain: certReader.getMainDomain(),
      domains: certReader.getAllDomains().join(","),
      ...this.cert,
    };
    const bodyStr = this.replaceTemplate(this.template, replaceBody);
    let data = JSON.parse(bodyStr);

    let url = this.webhook;
    if (this.method.toLowerCase() === "get") {
      const query = qs.stringify(data);
      if (url.includes("?")) {
        url = `${url}&${query}`;
      } else {
        url = `${url}?${query}`;
      }
      data = null;
    }

    const headers: any = {};
    if (this.headers && this.headers.trim()) {
      this.headers.split("\n").forEach(item => {
        item = item.trim();
        if (item) {
          const eqIndex = item.indexOf("=");
          if (eqIndex <= 0) {
            this.logger.warn("header格式错误,请使用=号分割", item);
            return;
          }
          const key = item.substring(0, eqIndex);
          headers[key] = item.substring(eqIndex + 1);
        }
      });
    }

    let res = null;
    try {
      res = await this.http.request({
        url: url,
        method: this.method,
        headers: {
          "Content-Type": `${this.contentType}; charset=UTF-8`,
          ...headers,
        },
        data: data,
        skipSslVerify: this.skipSslVerify,
        responseType: "text",
        returnOriginRes: true,
      });
    } catch (e) {
      if (e.response?.data) {
        throw new Error(e.message + "," + JSON.stringify(e.response.data));
      }
      throw e;
    }

    if (this.successStr && !res?.data?.includes(this.successStr)) {
      throw new Error(`请求失败,期望包含：${this.successStr},实际返回：${res.data}`);
    }
    return res;
  }

  async onInstance() {}

  async execute(): Promise<void> {
    this.logger.info(`通过webhook部署开始`);
    await this.send();
    this.logger.info("部署成功");
  }
}

new WebhookDeployCert();
