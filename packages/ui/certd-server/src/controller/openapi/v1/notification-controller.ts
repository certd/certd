import { ALL, Body, Controller, Inject, Post, Provide } from "@midwayjs/core";
import { CodeException, Constants, isNotificationType, NotificationTypes, NotificationTypeValue } from "@certd/lib-server";
import { logger } from "@certd/basic";
import type { NotificationSendReq } from "@certd/pipeline";
import { ApiTags } from "@midwayjs/swagger";
import { NotificationService } from "../../../modules/pipeline/service/notification-service.js";
import { OpenKey } from "../../../modules/open/service/open-key-service.js";
import { BaseOpenController } from "../base-open-controller.js";

export type OpenNotificationSendReq = {
  notificationId?: number;
  title: string;
  content: string;
  url?: string;
  notificationType?: NotificationTypeValue;
};

@Provide()
@Controller("/api/v1/notification")
@ApiTags(["openapi"])
export class OpenNotificationController extends BaseOpenController {
  @Inject()
  notificationService: NotificationService;

  @Post("/send", { description: Constants.per.open, summary: "通过默认通知渠道发送通知" })
  async send(@Body(ALL) req: OpenNotificationSendReq) {
    const openKey: OpenKey = this.ctx.openKey;
    const userId = openKey.userId;
    if (userId == null) {
      throw new CodeException(Constants.res.openKeyError);
    }
    if (!req?.title) {
      throw new Error("title不能为空");
    }
    if (!req?.content) {
      throw new Error("content不能为空");
    }
    req.notificationType = req.notificationType || NotificationTypes.Common;
    if (req.notificationType && !isNotificationType(req.notificationType)) {
      throw new Error("notificationType不存在");
    }

    const notificationRequest: NotificationSendReq = {
      useDefault: true,
      logger,
      body: {
        title: req.title,
        content: req.content,
        url: req.url,
        notificationType: req.notificationType,
      },
    };
    if (req.notificationId != null) {
      notificationRequest.id = req.notificationId;
    }

    await this.notificationService.send(notificationRequest, userId, openKey.projectId);
    return this.ok({ success: true });
  }
}
