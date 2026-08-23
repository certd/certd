import { IsAccess, AccessInput, BaseAccess } from "@certd/pipeline";
import { UniCloudClient } from "@certd/plugin-plus";

/**
 */
@IsAccess({
  name: "unicloud",
  title: "uniCloud",
  icon: "material-symbols:shield-outline",
  desc: "unicloud授权",
})
export class UniCloudAccess extends BaseAccess {
  @AccessInput({
    title: "账号",
    component: {
      placeholder: "email",
    },
    helper: "登录邮箱",
    required: true,
    encrypt: false,
  })
  email = "";

  @AccessInput({
    title: "密码",
    component: {
      placeholder: "密码",
    },
    required: true,
    encrypt: true,
  })
  password = "";

  // await this.getToken();

  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "onTestRequest",
    },
    helper: "点击测试接口看是否正常",
  })
  testRequest = true;

  async onTestRequest() {
    const client = new UniCloudClient({
      access: this,
      logger: this.ctx.logger,
      http: this.ctx.http,
    });
    await client.getToken();
    return "ok";
  }

  /**
     * unicloudClient.doRequest请求示例参考
     * async getDomainList(req: { spaceId: string; provider: string }): Promise<UniCloudDomain[]> {
      const { token, cookie } = await this.getToken();
      const { spaceId, provider } = req;
      const deviceId = this.deviceId;
      const secretKey = "4c1f7fbf-c732-42b0-ab10-4634a8bbe834";
      const clientInfo = `{"PLATFORM":"web","OS":"windows","APPID":"__UNI__unicloud_console","DEVICEID":"${deviceId}","scene":1001,"appId":"__UNI__unicloud_console","appLanguage":"zh-Hans","appName":"uniCloud控制台","appVersion":"1.0.0","appVersionCode":"100","browserName":"chrome","browserVersion":"122.0.6261.95","deviceId":"${deviceId}","deviceModel":"PC","deviceType":"pc","hostName":"chrome","hostVersion":"122.0.6261.95","osName":"windows","osVersion":"10 x64","ua":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.95 Safari/537.36","uniCompilerVersion":"4.57","uniPlatform":"web","uniRuntimeVersion":"4.57","locale":"zh-Hans","LOCALE":"zh-Hans"}`;
      const body = {
        method: "serverless.function.runtime.invoke",
        params: `{"functionTarget":"uni-cloud-kernel","functionArgs":{"action":"proxy/invoke","data":{"method":"get","token":"${token}","action":"host/domain-list","params":{"provider":"${provider}","spaceId":"${spaceId}"}},"clientInfo":${clientInfo},"uniIdToken":"${this.xToken}"}}`,
        spaceId: "dc-6nfabcn6ada8d3dd",
        timestamp: new Date().getTime(),
      };
      const xSign = await this.sign(body, secretKey);
      const res = await this.doRequest({
        url: "https://unicloud.dcloud.net.cn/client",
        method: "POST",
        data: body,
        headers: {
          "X-Client-Info": encodeURIComponent(clientInfo),
          "X-Serverless-Sign": xSign,
          "X-Client-Token": this.xToken,
          Cookie: cookie,
          Origin: "https://unicloud.dcloud.net.cn",
          Referer: "https://unicloud.dcloud.net.cn",
        },
      });
  
      return res?.data?.data?.domains ?? [];
    }
     */
}

new UniCloudAccess();
