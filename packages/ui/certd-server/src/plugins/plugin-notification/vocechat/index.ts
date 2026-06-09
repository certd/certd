import { BaseNotification, IsNotification, NotificationBody, NotificationInput } from "@certd/pipeline";

@IsNotification({
  name: "vocechat",
  title: "VoceChat通知",
  desc: "https://voce.chat",
  needPlus: true,
})
export class VoceChatNotification extends BaseNotification {
  @NotificationInput({
    title: "服务地址",
    component: {
      placeholder: "https://replace.your.domain",
    },
    required: true,
  })
  endpoint = "";

  @NotificationInput({
    title: "apiKey",
    component: {
      placeholder: "",
    },
    helper: "[获取APIKEY](https://doc.voce.chat/bot/bot-and-webhook)",
    required: true,
  })
  apiKey = "";

  @NotificationInput({
    title: "目标类型",
    component: {
      name: "a-select",
      options: [
        { value: "user", label: "用户" },
        { value: "channel", label: "频道" },
      ],
    },
    required: true,
    helper: "发送消息的目标类型",
  })
  targetType = "";

  @NotificationInput({
    title: "目标ID",
    component: {
      placeholder: "发送消息的目标ID",
    },
    required: true,
    helper: "目标ID可以是用户ID或频道ID",
  })
  targetId = "";

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
    if (!this.apiKey) {
      throw new Error("API Key不能为空");
    }

    if (!this.targetId) {
      throw new Error("目标ID不能为空");
    }

    const url = this.targetType === "user" ? "/api/bot/send_to_user/" : "/api/bot/send_to_group/";
    await this.http.request({
      url: url + this.targetId, // 这是示例API URL，请根据实际API文档调整
      baseURL: this.endpoint,
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "Content-Type": "text/markdown",
      },
      data: `# ${body.title}\n\n${body.content}\n\n[查看详情](${body.url})`,
      skipSslVerify: this.skipSslVerify,
    });
  }
}
