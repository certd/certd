import { BaseNotification, IsNotification, NotificationBody, NotificationInput } from "@certd/pipeline";

/**
 * POST请求
支持格式
application/json
text/plain
multipart/form-data
application/x-www-form-urlencoded
表单格式
POST /{昵称}/[title] HTTP/1.1
Content-Type: application/x-www-form-urlencoded

title=可选标题&msg=必填内容&url=可选链接&msgType=html&htmlHeight=400
    
纯文本格式
POST /{昵称}/[title] HTTP/1.1
Content-Type: text/plain

这里放置消息内容
    
POST JSON示例
POST /JohnDoe?msgType=html&htmlHeight=350 HTTP/1.1
Host: api.chuckfang.com
Content-Type: application/json

{
  "title": "系统通知",
  "msg": "<p><b>欢迎使用</b>，这是 <i>HTML</i> 格式的消息</p>",
  "url": "https://example.com"
}

===
返回值：
{
  "status": 200,
  "message": "推送成功"
}
 */
@IsNotification({
  name: "meow",
  title: "MeoW通知",
  desc: "https://api.chuckfang.com/",
  needPlus: false,
})
export class MeowNotification extends BaseNotification {
  @NotificationInput({
    title: "MeoW接口地址",
    component: {
      placeholder: "https://api.xxxxxx.com",
    },
    required: true,
  })
  endpoint = "";

  @NotificationInput({
    title: "昵称",
    component: {
      placeholder: "",
    },
    required: true,
  })
  nickName = "";

  async send(body: NotificationBody) {
    if (!this.nickName) {
      throw new Error("昵称不能为空");
    }
    let endpoint = this.endpoint;
    if (!endpoint.endsWith("/")) {
      endpoint += "/";
    }
    const url = `${endpoint}${this.nickName}/`;
    const res = await this.http.request({
      url: url,
      method: "POST",
      data: {
        text: body.title,
        msg: body.content,
        url: body.url,
      },
    });

    if (res.status !== 200) {
      throw new Error(res.message || res.msg);
    }
  }
}
