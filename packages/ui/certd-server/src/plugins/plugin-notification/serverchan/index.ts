import { BaseNotification, IsNotification, NotificationBody, NotificationInput } from "@certd/pipeline";

@IsNotification({
  name: "serverchan",
  title: "Server酱ᵀ",
  desc: "https://sct.ftqq.com/",
  needPlus: true,
})
export class ServerChanNotification extends BaseNotification {
  @NotificationInput({
    title: "服务地址",
    value: "https://sctapi.ftqq.com",
    required: true,
  })
  endpoint = "https://sctapi.ftqq.com";

  @NotificationInput({
    title: "SendKey",
    component: {
      placeholder: "https://sctapi.ftqq.com/<SENDKEY>.send",
    },
    helper: "https://sct.ftqq.com/ 微信扫码获取",
    required: true,
  })
  sendKey = "";

  @NotificationInput({
    title: "消息通道号",
    component: {
      placeholder: "9|66",
    },
    helper: "可以不填，最多两个通道，[通道配置说明](https://sct.ftqq.com/sendkey)",
    required: false,
  })
  channel: string;

  @NotificationInput({
    title: "是否隐藏IP",
    component: {
      name: "a-switch",
      vModel: "checked",
    },
    required: false,
  })
  noip: boolean;

  @NotificationInput({
    title: "忽略证书校验",
    value: false,
    component: {
      name: "a-switch",
      vModel: "checked",
    },
    required: false,
  })
  skipSslVerify: boolean;

  async send(body: NotificationBody) {
    if (!this.sendKey) {
      throw new Error("sendKey不能为空");
    }
    await this.http.request({
      url: `${this.endpoint}/${this.sendKey}.send`,
      method: "POST",
      data: {
        text: body.title,
        desp: body.content + "\n\n[查看详情](" + body.url + ")",
      },
      skipSslVerify: this.skipSslVerify,
    });
  }
}
