import { BaseNotification, IsNotification, NotificationBody, NotificationInput } from "@certd/pipeline";

@IsNotification({
  name: "discord",
  title: "Discord 通知",
  desc: "Discord 机器人通知",
  needPlus: true,
})
export class DiscordNotification extends BaseNotification {
  @NotificationInput({
    title: "Webhook URL",
    component: {
      placeholder: "https://discord.com/api/webhooks/xxxxx/xxxx",
    },
    helper: "[Discord Webhook 说明](https://discord.com/developers/docs/resources/webhook#execute-webhook)",
    required: true,
  })
  webhook = "";

  @NotificationInput({
    title: "提醒指定成员",
    component: {
      name: "a-select",
      vModel: "value",
      mode: "tags",
      open: false,
    },
    required: false,
    helper: "填写成员的Id，或者角色Id（&id），或者everyone",
  })
  mentionedList!: string[];

  @NotificationInput({
    title: "代理",
    component: {
      placeholder: "http://xxxxx:xx",
    },
    helper: "使用https_proxy",
    required: false,
  })
  httpsProxy = "";

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
    if (!this.webhook) {
      throw new Error("Webhook URL 不能为空");
    }

    // 创建 Discord 消息体
    let content = `${body.title}\n${body.content}\n\n[查看详情](${body.url})`;
    if (this.mentionedList && this.mentionedList.length > 0) {
      content += `\n${this.mentionedList.map(item => `<@${item}>  `).join("")}`;
    }

    const json = {
      content: content,
    };

    await this.http.request({
      url: this.webhook,
      method: "POST",
      data: json,
      httpProxy: this.httpsProxy,
      skipSslVerify: this.skipSslVerify,
    });
  }
}
