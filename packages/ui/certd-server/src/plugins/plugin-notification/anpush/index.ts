import { BaseNotification, IsNotification, NotificationBody, NotificationInput } from "@certd/pipeline";

@IsNotification({
  name: "anpush",
  title: "AnPush",
  desc: "https://anpush.com",
  needPlus: true,
})
export class AnPushNotification extends BaseNotification {
  @NotificationInput({
    title: "API密钥",
    component: {
      placeholder: "",
    },
    helper: "[获取API密钥](https://anpush.com/push/tool) ",
    required: true,
  })
  token = "";

  @NotificationInput({
    title: "通道ID",
    component: {
      placeholder: "",
    },
    helper: "[获取通道ID](https://anpush.com/push/setting)创建通道，复制通道id，填入此处",
    required: true,
  })
  channel = "";

  async send(body: NotificationBody) {
    if (!this.token) {
      throw new Error("token不能为空");
    }
    const config = {
      url: `https://api.anpush.com/push/${this.token}`,
      method: "POST",
      timeout: 0,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: {
        title: body.title,
        content: body.content + "\n\n[查看详情](" + body.url + ")",
        channel: this.channel,
      },
    };
    const res = await this.http.request(config);
    if (res.code != 200) {
      throw new Error("发送失败:" + res.msg);
    }
  }
}
