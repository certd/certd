import { BaseNotification, IsNotification, NotificationBody, NotificationInput } from "@certd/pipeline";

@IsNotification({
  name: "feishu",
  title: "飞书通知",
  desc: "飞书群聊webhook通知",
  needPlus: true,
})
// https://open.dingtalk.com/document/orgapp/the-creation-and-installation-of-the-application-robot-in-the?spm=ding_open_doc.document.0.0.242d1563cDgZz3
export class FeishuNotification extends BaseNotification {
  @NotificationInput({
    title: "webhook地址",
    component: {
      placeholder: "https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxxxxxxxxxx",
    },
    helper: "飞书APP->群聊->设置->机器人->添加机器人->自定义webhook->[创建机器人->复制webhook地址](https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot?lang=zh-CN)",
    required: true,
  })
  webhook = "";

  @NotificationInput({
    title: "加签密钥",
    component: {
      placeholder: "SECxxxxxxxxxxxxxxxxxxxxx",
    },
    helper: "必须选择一种安全设置，建议选择加密密钥",
    required: false,
  })
  secret = "";

  @NotificationInput({
    title: "@用户",
    component: {
      placeholder: "非必填，支持多个，填写完一个按回车",
      name: "a-select",
      vModel: "value",
      mode: "tags",
      multiple: true,
      open: false,
    },
    helper: "填写要@的用户ID：【ou_xxxxxxxxx】\n用户ID获取方法,[查看OpenId获取方法](https://open.feishu.cn/document/home/user-identity-introduction/open-id)",
    required: false,
  })
  atUserIds: string[];

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
    const crypto = await import("crypto");
    const secret = this.secret;
    const timestamp = Math.floor(Date.now() / 1000);
    const str = Buffer.from(`${timestamp}\n${secret}`, "utf8");
    const sign = crypto.createHmac("SHA256", str);
    sign.update(Buffer.alloc(0));
    return { timestamp, sign: sign.digest("base64") };
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

    const webhook = this.webhook;

    /*
    // @ 单个用户
<at user_id="ou_xxx">名字</at>
// @ 所有人
<at user_id="all">所有人</at>
     */
    let atText = "";
    if (this.atUserIds && this.atUserIds.length > 0) {
      atText = this.atUserIds
        .map((id: string) => {
          const nameIndex = id.indexOf(".");
          let name = id;
          if (nameIndex > 0) {
            name = id.substring(nameIndex + 1);
          }
          return `<at id=${id}>${name}</at>`;
        })
        .join("");
    }
    if (this.isAtAll) {
      atText = `<at id=all>所有人</at>`;
    }

    if (atText) {
      atText = `\n${atText}`;
    }

    let sign: any = {};
    if (this.secret) {
      const signRet = await this.sign();
      sign = {
        timestamp: signRet.timestamp,
        sign: signRet.sign,
      };
    }

    const cardBody = {
      msg_type: "interactive",
      card: {
        schema: "2.0",
        config: {
          update_multi: true,
          style: {
            text_size: {
              normal_v2: {
                default: "normal",
                pc: "normal",
                mobile: "heading",
              },
            },
          },
        },
        header: {
          title: {
            tag: "plain_text",
            content: body.title,
          },
          subtitle: {
            tag: "plain_text",
            content: "",
          },
          template: body.errorMessage ? "red" : "green",
          padding: "12px 12px 12px 12px",
        },
        body: {
          direction: "vertical",
          padding: "12px 12px 12px 12px",
          elements: [
            {
              tag: "markdown",
              content: body.content + atText,
              text_align: "left",
              text_size: "normal_v2",
              margin: "0px 0px 0px 0px",
            },
            {
              tag: "button",
              text: {
                tag: "plain_text",
                content: "查看详情",
              },
              type: "default",
              width: "default",
              size: "medium",
              behaviors: [
                {
                  type: "open_url",
                  default_url: body.url,
                  pc_url: "",
                  ios_url: "",
                  android_url: "",
                },
              ],
              margin: "0px 0px 0px 0px",
            },
          ],
        },
      },
    };

    const res = await this.http.request({
      url: webhook,
      method: "POST",
      data: {
        ...sign,
        ...cardBody,
      },
    });
    if (res.code > 100) {
      throw new Error(`发送失败：${res.msg}`);
    }
  }
}
