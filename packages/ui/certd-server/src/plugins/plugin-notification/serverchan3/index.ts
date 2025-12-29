import { BaseNotification, IsNotification, NotificationBody, NotificationInput } from '@certd/pipeline';

@IsNotification({
  name: 'serverchan3',
  title: 'Server酱³',
  desc: 'https://doc.sc3.ft07.com/serverchan3',
  needPlus: true,
})
export class ServerChan3Notification extends BaseNotification {
  @NotificationInput({
    title: 'ApiURL',
    component: {
      placeholder: 'https://uid.push.ft07.com/send/sendKey.send',
    },
    required: true,
  })
  apiURL = '';

  @NotificationInput({
    title: '标签Tags',
    component: {
      name: 'a-select',
      vModel: 'value',
      mode: 'tags',
      open: false,
    },
    helper: '支持多个，回车后填写下一个',
    required: false,
  })
  tags: string[];

  @NotificationInput({
    title: 'short',
    required: false,
  })
  short: string;

  @NotificationInput({
    title: '忽略证书校验',
    value: false,
    component: {
      name: 'a-switch',
      vModel: 'checked',
    },
    required: false,
  })
  skipSslVerify: boolean;

  async send(body: NotificationBody) {
    if (!this.apiURL) {
      throw new Error('sendKey不能为空');
    }
    await this.http.request({
      url: `${this.apiURL}`,
      method: 'POST',
      data: {
        text: body.title,
        desp: body.content + '\n\n[查看详情](' + body.url + ')',
        tags: this.tags?.join('|') || undefined,
        short: this.short,
      },
      skipSslVerify: this.skipSslVerify,
    });
  }
}
