import { BaseNotification, IsNotification, NotificationBody, NotificationInput } from '@certd/pipeline';

@IsNotification({
  name: 'email',
  title: '电子邮件',
  desc: '电子邮件通知',
  order: -100,
})
export class EmailNotification extends BaseNotification {
  @NotificationInput({
    title: '收件人邮箱',
    component: {
      name: 'email-selector',
      vModel: 'value',
      mode: 'tags',
      // open: false,
    },
    required: true,
    helper: '可以填写多个，填写一个按回车键再填写下一个\n需要先[配置邮件服务器](#/sys/settings/email)',
  })
  receivers!: string[];

  async send(body: NotificationBody) {

    const templateData = {
      ...body,
    }
    await this.ctx.emailService.sendByTemplate({
      type: body.notificationType,
      data: templateData,
      email: {
        receivers: this.receivers,
        attachments: body.attachments,
      }
    })

    // await this.ctx.emailService.send({
    //   subject: body.title,
    //   content: body.content + '\n\n[查看详情](' + body.url + ')',
    //   receivers: this.receivers,
    // });
  }
}
