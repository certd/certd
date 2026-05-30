import { IsAccess, AccessInput, BaseAccess } from "@certd/pipeline";

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: "proxmox",
  title: "proxmox",
  desc: "",
  icon: "svg:icon-proxmox",
})
export class ProxmoxAccess extends BaseAccess {
  /**
   * 授权属性配置
   */
  @AccessInput({
    title: "host",
    component: {
      placeholder: "IP或域名",
    },
    required: true,
    encrypt: false,
  })
  host = "";

  @AccessInput({
    title: "端口",
    component: {
      placeholder: "端口",
      component: {
        name: "a-input-number",
      },
    },
    required: true,
    encrypt: false,
  })
  port: number;
  /**
   * 授权属性配置
   */
  @AccessInput({
    title: "用户名",
    component: {
      placeholder: "username",
    },
    required: true,
    encrypt: false,
  })
  username = "";

  @AccessInput({
    title: "密码",
    component: {
      placeholder: "password",
    },
    required: true,
    encrypt: true,
  })
  password = "";

  @AccessInput({
    title: "领域",
    value: "pam",
    component: {
      placeholder: "pam、pve。默认值 pam",
    },
    helper: "pam 或 pve。默认值 pam",
    required: false,
    encrypt: false,
  })
  realm = "";

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
    await this.getNodeList();
    return "ok";
  }

  async getNodeList() {
    const client = await this.getClient();
    const nodesRes = await client.nodes.index();
    // this.logger.info('nodes:', nodesRes.response);
    if (!nodesRes.response?.data) {
      return [];
    }
    return nodesRes.response.data;
  }

  async getClient() {
    const pve = await import("@certd/cv4pve-api-javascript");
    const client = new pve.PveClient(this.host, this.port);
    const login = await client.login(this.username, this.password, this.realm || "pam");
    if (!login) {
      throw new Error(`Login failed:${JSON.stringify(login)}`);
    }
    const versionRes = await client.version.version();
    this.ctx.logger.info("Proxmox version:", versionRes.response);
    return client;
  }
}

new ProxmoxAccess();
