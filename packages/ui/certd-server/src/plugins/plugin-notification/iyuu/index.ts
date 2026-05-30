import { BaseNotification, IsNotification, NotificationBody, NotificationInput } from "@certd/pipeline";

@IsNotification({
  name: "iyuu",
  title: "爱语飞飞微信通知(iyuu)",
  desc: "https://iyuu.cn/",
  needPlus: true,
})
export class IyuuNotification extends BaseNotification {
  @NotificationInput({
    title: "Token令牌",
    component: {
      placeholder: "",
    },
    helper: "https://iyuu.cn/ 微信扫码获取",
    required: true,
  })
  token = "";

  async send(body: NotificationBody) {
    if (!this.token) {
      throw new Error("token不能为空");
    }
    const res = await this.http.request({
      url: `https://iyuu.cn/${this.token}.send`,
      method: "POST",
      data: {
        text: body.title,
        desp: body.content + "\n\n[查看详情](" + body.url + ")",
      },
    });

    if (res.errcode !== 0) {
      throw new Error(res.errmsg);
    }
  }
}
