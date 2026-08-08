/// <reference types="mocha" />
/// <reference types="node" />

import assert from "node:assert/strict";
import { logger } from "@certd/basic";
import { NotificationTypes } from "@certd/lib-server";
import { OpenNotificationController } from "./notification-controller.js";

describe("OpenNotificationController.send", () => {
  it("sends through the open key user's default notification channel", async () => {
    const controller = new OpenNotificationController();
    const sendRequests: any[] = [];
    controller.notificationService = {
      async send(req: any, userId: number, projectId: number) {
        sendRequests.push({ req, userId, projectId });
      },
    } as any;
    controller.ctx = {
      openKey: { userId: 1, projectId: 2 },
    } as any;
    controller.ok = value => value;

    const request = {
      title: "证书部署失败",
      content: "example.com 部署失败，请检查部署日志",
      url: "https://client.example.com/logs/123",
      notificationType: NotificationTypes.CertDeployError,
    };
    const result = await controller.send(request);

    assert.deepEqual(result, { success: true });
    assert.deepEqual(sendRequests, [
      {
        userId: 1,
        projectId: 2,
        req: {
          useDefault: true,
          logger,
          body: {
            title: request.title,
            content: request.content,
            url: request.url,
            notificationType: request.notificationType,
          },
        },
      },
    ]);
  });

  it("rejects requests without a title or content", async () => {
    const controller = new OpenNotificationController();
    controller.ctx = { openKey: { userId: 1 } } as any;
    controller.notificationService = {} as any;

    await assert.rejects(() => controller.send({ notificationId: 0, title: "", content: "消息" }), /title不能为空/);
    await assert.rejects(() => controller.send({ notificationId: 0, title: "标题", content: "" }), /content不能为空/);
  });

  it("uses the requested notification channel when notificationId is provided", async () => {
    const controller = new OpenNotificationController();
    const sendRequests: any[] = [];
    controller.notificationService = {
      async send(req: any) {
        sendRequests.push(req);
      },
    } as any;
    controller.ctx = { openKey: { userId: 1 } } as any;

    await controller.send({ notificationId: 12, title: "标题", content: "消息" });

    assert.equal(sendRequests[0].id, 12);
  });

  it("rejects unregistered notification types", async () => {
    const controller = new OpenNotificationController();
    controller.ctx = { openKey: { userId: 1 } } as any;
    controller.notificationService = {} as any;

    await assert.rejects(() => controller.send({ notificationId: 0, title: "标题", content: "消息", notificationType: "unknown" as any }), /notificationType不存在/);
  });
});
