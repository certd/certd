import { AbstractAccess, IsAccess } from "@certd/pipeline";

@IsAccess({
  name: "ssh",
  title: "主机登录授权",
  desc: "",
  input: {
    host: {
      title: "主机地址",
      component: {
        placeholder: "主机域名或IP地址",
      },
      required: true,
    },
    port: {
      title: "端口",
      value: "22",
      component: {
        placeholder: "22",
      },
      rules: [{ required: true, message: "此项必填" }],
    },
    username: {
      title: "用户名",
      value: "root",
      rules: [{ required: true, message: "此项必填" }],
    },
    password: {
      title: "密码",
      component: {
        name: "a-input-password",
        vModel: "value",
      },
      helper: "登录密码或密钥必填一项",
    },
    privateKey: {
      title: "密钥",
      helper: "密钥或密码必填一项",
    },
  },
})
export class SshAccess extends AbstractAccess {
  host = "";
  port = 22;
  username = "root";
  password?: string;
  privateKey?: string;
}
