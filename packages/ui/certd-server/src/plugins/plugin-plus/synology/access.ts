import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";
import { SynologyClient } from "@certd/plugin-plus";
/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: "synology",
  title: "群晖登录授权",
  desc: "",
  icon: "simple-icons:synology",
})
export class SynologyAccess extends BaseAccess {
  @AccessInput({
    title: "群晖版本",
    component: {
      name: "a-select",
      vModel: "value",
      options: [
        { label: "7.x", value: "7" },
        { label: "6.x", value: "6" },
      ],
    },
    required: true,
  })
  version = "7";

  @AccessInput({
    title: "群晖面板的url",
    component: {
      placeholder: "https://yourdomain:5006",
    },
    helper: "群晖面板的访问地址,例如：https://yourdomain:5006",
    required: true,
  })
  baseUrl = "";

  @AccessInput({
    title: "账号",
    component: {
      placeholder: "账号",
    },
    helper: "群晖面板登录账号，必须是处于管理员用户组",
    required: true,
  })
  username = "";

  @AccessInput({
    title: "密码",
    component: {
      placeholder: "密码",
    },
    helper: "群晖面板登录密码",
    required: true,
    encrypt: true,
  })
  password = "";

  @AccessInput({
    title: "双重认证",
    value: false,
    component: {
      name: "a-switch",
      vModel: "checked",
    },
    helper: "是否启用了双重认证",
    required: true,
  })
  otp = false;

  @AccessInput({
    title: "设备ID",
    component: {
      placeholder: "设备ID",
      name: "synology-device-id-getter",
      type: "access",
      typeName: "synology",
    },
    mergeScript: `
     return {
        component:{
          form: ctx.compute(({form})=>{
            return form
          })
        },
        show: ctx.compute(({form})=>{
           return form.access.otp
        })
     }
    `,
    helper: `1.如果开启了双重认证，需要获取设备ID
2.填好上面的必填项，然后点击获取设备ID，输入双重认证APP上的码，确认即可获得设备ID，此操作只需要做一次
3.注意：必须勾选‘安全性->允许网页浏览器的用户通过信任设备来跳过双重验证
4.注意：在群晖信任设备页面里面会生成一条记录，不要删除
5.注意：需要将流水线证书申请过期前多少天设置为30天以下，避免设备ID过期`,
    required: false,
    encrypt: true,
  })
  deviceId = "";

  @AccessInput({
    title: "忽略证书校验",
    value: true,
    component: {
      name: "a-switch",
      vModel: "checked",
    },
    helper: "如果面板的url是https，且使用的是自签名证书，则需要开启此选项，其他情况可以关闭",
  })
  skipSslVerify = true;

  /**
   * 请求超时时间设置
   * @param data
   */
  @AccessInput({
    title: "请求超时",
    value: 120,
    component: {
      name: "a-input-number",
      vModel: "value",
    },
    helper: "请求超时时间，单位:秒",
  })
  timeout = 120;

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
    const client = new SynologyClient(this as any, this.ctx.http, this.ctx.logger, this.skipSslVerify);
    await client.doLogin();
    await client.getCertList();
    return "ok";
  }

  onLoginWithOPTCode(data: { otpCode: string }) {
    const ctx = this.ctx;
    const client = new SynologyClient(this as any, ctx.http, ctx.logger, this.skipSslVerify);
    return client.doLoginWithOTPCode(data.otpCode);
  }
}

new SynologyAccess();
