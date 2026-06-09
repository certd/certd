import { BaseNotification, IsNotification, NotificationBody, NotificationInput } from "@certd/pipeline";

@IsNotification({
  name: "slack",
  title: "Slack通知",
  desc: "Slack消息推送通知",
  needPlus: true,
})
export class SlackNotification extends BaseNotification {
  @NotificationInput({
    title: "webhook地址",
    component: {
      placeholder: "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
    },
    helper: "[APPS](https://api.slack.com/apps/)->进入APP->incoming-webhooks->Add New Webhook to Workspace",
    required: true,
  })
  webhook = "";

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
      throw new Error("token不能为空");
    }

    await this.http.request({
      url: this.webhook,
      method: "POST",
      data: {
        text: `${body.title}\n${body.content}\n\n[查看详情](${body.url})`,
      },
      httpProxy: this.httpsProxy,
      skipSslVerify: this.skipSslVerify,
    });
  }
}
