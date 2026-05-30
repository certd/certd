import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";

@IsAccess({
  name: "bind9",
  title: "BIND9 DNS 授权",
  desc: "通过 SSH 连接到 BIND9 服务器，使用 nsupdate 命令管理 DNS 记录",
  icon: "clarity:host-line",
})
export class Bind9Access extends BaseAccess {
  @AccessInput({
    title: "SSH 授权",
    helper: "选择已配置的 SSH 授权",
    component: {
      name: "access-selector",
      type: "ssh",
      vModel: "modelValue",
    },
    required: true,
  })
  sshAccessId!: string;

  @AccessInput({
    title: "DNS 服务器地址",
    helper: "BIND9 DNS 服务器地址，用于 nsupdate 命令",
    component: {
      placeholder: "192.168.182.100",
    },
  })
  dnsServer: string;

  @AccessInput({
    title: "DNS 服务器端口",
    helper: "BIND9 DNS 服务器端口，用于 nsupdate 命令，默认为 53",
    value: 53,
    component: {
      name: "a-input-number",
      placeholder: "53",
    },
  })
  dnsPort = 53;

  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      type: "access",
      typeName: "bind9",
      action: "TestRequest",
    },
    mergeScript: `
         return {
            component:{
              form: ctx.compute(({form})=>{
                return form
              })
            },
         }
        `,
    helper: "点击测试 SSH 连接和 nsupdate 命令",
  })
  testRequest = true;

  async onTestRequest() {
    const { SshClient } = await import("../plugin-lib/ssh/ssh.js");
    const client = new SshClient(this.ctx.logger);

    // 获取 SSH 授权配置
    const sshAccess = await this.ctx.accessService.getById(this.sshAccessId);
    if (!sshAccess) {
      throw new Error("SSH 授权不存在");
    }

    // 测试 SSH 连接
    const script = ["echo 'SSH connection successful'", "which nsupdate", "exit"];
    await client.exec({
      connectConf: sshAccess,
      script: script,
    });
    return "SSH 连接成功，nsupdate 命令可用";
  }
}

new Bind9Access();
