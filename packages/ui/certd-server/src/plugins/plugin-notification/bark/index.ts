/**
 * curl -X "POST" "https://api.day.app/your_key" \
 *      -H 'Content-Type: application/json; charset=utf-8' \
 *      -d $'{
 *   "body": "Test Bark Server",
 *   "title": "Test Title",
 *   "badge": 1,
 *   "category": "myNotificationCategory",
 *   "sound": "minuet.caf",
 *   "icon": "https://day.app/assets/images/avatar.jpg",
 *   "group": "test",
 *   "url": "https://mritd.com"
 * }'
 */

import { BaseNotification, IsNotification, NotificationBody, NotificationInput } from "@certd/pipeline";

@IsNotification({
  name: "bark",
  title: "Bark 通知",
  desc: "Bark 推送通知插件",
  needPlus: true,
})
export class BarkNotification extends BaseNotification {
  @NotificationInput({
    title: "服务地址",
    component: {
      placeholder: "https://api.day.app/your_key",
    },
    required: true,
    helper: "你的bark服务地址+key",
  })
  webhook = "";

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
      throw new Error("服务器地址不能为空");
    }

    const payload = {
      body: `${body.content}\n\n[查看详情](${body.url})`, // 使用传入的内容或默认内容
      title: body.title, // 使用传入的标题或默认标题
    };

    await this.http.request({
      url: `${this.webhook}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      data: payload,
      skipSslVerify: this.skipSslVerify,
    });
  }
}
