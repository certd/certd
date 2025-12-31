import { IsAccess, AccessInput, BaseAccess } from "@certd/pipeline";

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: "ftp",
  title: "FTP授权",
  desc: "",
  icon: "mdi:folder-upload-outline",
})
export class FtpAccess extends BaseAccess {
  @AccessInput({
    title: "host",
    component: {
      placeholder: "ip / 域名",
      name: "a-input",
      vModel: "value",
    },
    helper: "FTP地址",
    required: true,
  })
  host!: string;

  @AccessInput({
    title: "端口",
    value: 21,
    component: {
      placeholder: "21",
      name: "a-input-number",
      vModel: "value",
    },
    helper: "FTP端口",
    required: true,
  })
  port!: string;

  @AccessInput({
    title: "user",
    component: {
      placeholder: "用户名",
    },
    helper: "FTP用户名",
    required: true,
  })
  user!: string;

  @AccessInput({
    title: "password",
    component: {
      placeholder: "密码",
      component: {
        name: "a-input-password",
        vModel: "value",
      },
    },
    encrypt: true,
    helper: "FTP密码",
    required: true,
  })
  password!: string;

  @AccessInput({
    title: "secure",
    value: false,
    component: {
      name: "a-switch",
      vModel: "checked",
    },
    helper: "是否使用SSL",
    required: true,
  })
  secure?: boolean = false;
}

new FtpAccess();
