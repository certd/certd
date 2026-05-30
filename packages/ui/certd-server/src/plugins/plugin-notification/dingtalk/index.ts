import { BaseNotification, IsNotification, NotificationBody, NotificationInput } from "@certd/pipeline";

@IsNotification({
  name: "dingtalk",
  title: "钉钉通知",
  desc: "钉钉群聊通知",
  needPlus: true,
})
// https://open.dingtalk.com/document/orgapp/the-creation-and-installation-of-the-application-robot-in-the?spm=ding_open_doc.document.0.0.242d1563cDgZz3
export class DingTalkNotification extends BaseNotification {
  @NotificationInput({
    title: "webhook地址",
    component: {
      placeholder: "https://oapi.dingtalk.com/robot/send?access_token=xxxxxxxxxxxxxxx",
    },
    helper: "钉钉APP->群聊->设置->机器人->添加机器人->自定义->[创建机器人->复制webhook地址](https://open.dingtalk.com/document/robots/custom-robot-access)",
    required: true,
  })
  webhook = "";

  @NotificationInput({
    title: "加签密钥",
    component: {
      placeholder: "SECxxxxxxxxxxxxxxxxxxxxx",
    },
    helper: "必须选择一种安全设置，请选择加密密钥",
    required: false,
  })
  secret = "";

  @NotificationInput({
    title: "@用户ID",
    component: {
      placeholder: "非必填，填写完一个按回车",
      name: "a-select",
      vModel: "value",
      mode: "tags",
      multiple: true,
      open: false,
    },
    helper: "填写要@的用户ID",
    required: false,
  })
  atUserIds: string[];

  @NotificationInput({
    title: "@用户手机号",
    component: {
      placeholder: "非必填，填写一个按回车",
      name: "a-select",
      vModel: "value",
      mode: "tags",
      multiple: true,
      open: false,
    },
    helper: "填写要@的用户的手机号",
    required: false,
  })
  atMobiles: string[];

  @NotificationInput({
    title: "@all",
    component: {
      placeholder: "非必填",
      name: "a-switch",
      vModel: "checked",
    },
    helper: "是否@所有人",
    required: false,
  })
  isAtAll: boolean;

  async sign() {
    const timestamp = Date.now();
    const secret = this.secret;
    const stringToSign = `${timestamp}\n${secret}`;
    /**
     * string_to_sign = '{}\n{}'.format(timestamp, secret)
     * string_to_sign_enc = string_to_sign.encode('utf-8')
     * hmac_code = hmac.new(secret_enc, string_to_sign_enc, digestmod=hashlib.sha256).digest()
     * sign = urllib.parse.quote_plus(base64.b64encode(hmac_code))
     */
    const crypto = await import("crypto");
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(stringToSign);
    const sign = encodeURIComponent(Buffer.from(hmac.digest()).toString("base64"));

    return {
      timestamp,
      sign,
    };
  }

  async send(body: NotificationBody) {
    if (!this.webhook) {
      throw new Error("webhook地址不能为空");
    }
    /**
     *
     *      "msgtype": "text",
     *      "text": {
     *          "content": "hello world"
     *      }
     *    }
     */

    let webhook = this.webhook;
    if (this.secret) {
      const signRet = await this.sign();
      webhook = `${webhook}&timestamp=${signRet.timestamp}&sign=${signRet.sign}`;
    }

    const at: any = {};
    if (this.atUserIds && this.atUserIds.length > 0) {
      at.atUserIds = this.atUserIds;
    }
    if (this.atMobiles && this.atMobiles.length > 0) {
      at.atMobiles = this.atMobiles;
    }
    if (this.isAtAll) {
      at.isAtAll = true;
    }

    const color = body.errorMessage ? "red" : "green";
    const res = await this.http.request({
      url: webhook,
      method: "POST",
      data: {
        at: at,
        markdown: {
          title: body.title,
          text: `<font color='${color}'>${body.title}</font>\n\n\n ${body.content}\n\n\n[查看详情](${body.url})`,
        },
        msgtype: "markdown",
      },
    });
    if (res.errcode > 100) {
      throw new Error(`发送失败：${res.errmsg}`);
    }
  }
}
