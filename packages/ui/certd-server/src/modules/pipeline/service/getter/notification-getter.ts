import { INotificationService, NotificationSendReq } from "@certd/pipeline";
import { NotificationService } from "../notification-service.js";

export class NotificationGetter implements INotificationService {
  userId: number;
  projectId: number;
  notificationService: NotificationService;

  constructor(userId: number, projectId: number, notificationService: NotificationService) {
    this.userId = userId;
    this.projectId = projectId;
    this.notificationService = notificationService;
  }

  async getDefault() {
    return await this.notificationService.getDefault(this.userId, this.projectId);
  }

  async getById(id: any) {
    return await this.notificationService.getById(id, this.userId, this.projectId);
  }

  async send(req: NotificationSendReq): Promise<void> {
    return await this.notificationService.send(req, this.userId, this.projectId);
  }

  async getBindUrl(url: string) {
    return await this.notificationService.getBindUrl(url);
  }
}
