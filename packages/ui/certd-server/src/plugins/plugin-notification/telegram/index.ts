import { BaseNotification, IsNotification, NotificationBody, NotificationInput } from '@certd/pipeline';

@IsNotification({
  name: 'telegram',
  title: 'Telegram通知',
  desc: 'Telegram Bot推送通知',
  needPlus: true,
})
export class TelegramNotification extends BaseNotification {
  @NotificationInput({
    title: 'URL',
    value: 'https://api.telegram.org',
    component: {
      placeholder: 'https://api.telegram.org',
    },
    required: true,
  })
  endpoint = 'https://api.telegram.org';

  @NotificationInput({
    title: 'Bot Token',
    component: {
      placeholder: '123456789:ABCdefGhijklmnopqrstUVWXyz',
    },
    helper: '[token获取](https://core.telegram.org/bots/features#botfather)',
    required: true,
  })
  botToken = '';

  @NotificationInput({
    title: '聊天ID',
    component: {
      placeholder: '聊天ID，例如 123456789 或 @channelusername',
    },
    helper: '用户ID(纯数字)或频道名称(@xxxx)',
    required: true,
  })
  chatId = '';

  @NotificationInput({
    title: '代理',
    component: {
      placeholder: 'http://xxxxx:xx',
    },
    helper: '使用https_proxy',
    required: false,
  })
  httpsProxy = '';

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

  replaceText(text: string) {
    // .*()<> 等都需要用\\进行替换
    return text.replace(/[\\.*()<>-]/g, '\\$&');
  }
  async send(body: NotificationBody) {
    if (!this.botToken || !this.chatId) {
      throw new Error('Bot Token 和聊天ID不能为空');
    }

    // 构建消息内容
    const messageContent = `${this.replaceText(body.title)}\n\n${this.replaceText(body.content)}\n\n[查看详情](${body.url})`;

    // Telegram API URL
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

    // 发送 HTTP 请求
    await this.http.request({
      url: url,
      method: 'POST',
      data: {
        chat_id: this.chatId,
        text: messageContent,
        parse_mode: 'MarkdownV2', // 或使用 'HTML' 取决于需要的格式
      },
      httpProxy: this.httpsProxy,
      skipSslVerify: this.skipSslVerify,
    });
  }
}
