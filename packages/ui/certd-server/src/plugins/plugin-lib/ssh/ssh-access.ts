import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";
@IsAccess({
  name: "ssh",
  title: "Host Login Authorization",
  desc: "",
  icon: "clarity:host-line",
  input: {},
  order: 0,
})
export class SshAccess extends BaseAccess {
  @AccessInput({
    title: "Host Address",
    component: {
      placeholder: "Host domain or IP address",
    },
    required: true,
  })
  host!: string;
  @AccessInput({
    title: "Port",
    value: 22,
    component: {
      name: "a-input-number",
      placeholder: "22",
    },
    rules: [{ required: true, message: "This field is required" }],
  })
  port!: number;
  @AccessInput({
    title: "Username",
    value: "root",
    rules: [{ required: true, message: "This field is required" }],
  })
  username!: string;
  @AccessInput({
    title: "Password",
    component: {
      name: "a-input-password",
      vModel: "value",
    },
    encrypt: true,
    helper: "A login password or private key is required",
  })
  password!: string;
  @AccessInput({
    title: "Private Key Login",
    helper: "A private key or password is required",
    component: {
      name: "pem-input",
      vModel: "modelValue",
    },
    encrypt: true,
  })
  privateKey!: string;

  @AccessInput({
    title: "Private Key Passphrase",
    helper: "If your private key has a passphrase",
    component: {
      name: "a-input-password",
      vModel: "value",
    },
    encrypt: true,
  })
  passphrase!: string;

  @AccessInput({
    title: "Script Type",
    helper: "bash 、sh 、fish",
    component: {
      name: "a-select",
      vModel: "value",
      options: [
        { value: "default", label: "Default" },
        { value: "sh", label: "sh" },
        { value: "bash", label: "bash" },
        { value: "fish", label: "fish (set -e is not supported)" },
      ],
    },
  })
  scriptType: string;

  @AccessInput({
    title: "Pseudo Terminal",
    helper: "If login fails with: all authentication methods failed / unable to exec, try enabling pseudo-terminal mode for keyboard-interactive login.\nThis may affect log output.",
    component: {
      name: "a-switch",
      vModel: "checked",
    },
  })
  pty!: boolean;

  @AccessInput({
    title: "SOCKS Proxy",
    helper: "SOCKS proxy configuration, format: socks5://user:password@host:port",
    component: {
      name: "a-input",
      vModel: "value",
      placeholder: "socks5://user:password@host:port",
    },
    encrypt: false,
  })
  socksProxy!: string;

  @AccessInput({
    title: "Timeout",
    helper: "Command execution timeout in seconds, default 30 minutes",
    component: {
      name: "a-input-number",
    },
  })
  timeout: number;

  @AccessInput({
    title: "Windows",
    helper: "Select this for Windows hosts.\nWindows requires [OpenSSH](https://certd.docmirror.cn/guide/use/host/windows.html).",
    component: {
      name: "a-switch",
      vModel: "checked",
    },
  })
  windows = false;

  @AccessInput({
    title: "Command Encoding",
    helper: "If this is a Windows host and output is garbled, try GBK",
    component: {
      name: "a-select",
      vModel: "value",
      options: [
        { value: "", label: "Default" },
        { value: "GBK", label: "GBK" },
        { value: "UTF8", label: "UTF-8" },
      ],
    },
  })
  encoding: string;

  @AccessInput({
    title: "Test",
    component: {
      name: "api-test",
      type: "access",
      typeName: "ssh",
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
    helper: "Click to test",
  })
  testRequest = true;

  async onTestRequest() {
    const { SshClient } = await import("./ssh.js");
    const client = new SshClient(this.ctx.logger);

    const script = ["echo hello", "exit"];
    await client.exec({
      connectConf: this,
      script: script,
    });
    return "ok";
  }
}

new SshAccess();
