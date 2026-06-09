import { Body, Controller, Inject, Post, Provide } from "@midwayjs/core";
import { BaseController } from "@certd/lib-server";
import { Constants } from "@certd/lib-server";
import { EmailService } from "../../../modules/basic/service/email-service.js";
import { ApiTags } from "@midwayjs/swagger";

/**
 */
@Provide()
@Controller("/api/mine/email")
@ApiTags(["mine"])
export class EmailController extends BaseController {
  @Inject()
  emailService: EmailService;

  @Post("/test", { description: Constants.per.authOnly, summary: "测试邮件发送" })
  public async test(@Body("receiver") receiver) {
    const userId = super.getUserId();
    await this.emailService.test(userId, receiver);
    return this.ok({});
  }

  @Post("/list", { description: Constants.per.authOnly, summary: "查询邮件列表" })
  public async list() {
    const userId = super.getUserId();
    const res = await this.emailService.list(userId);
    return this.ok(res);
  }

  @Post("/add", { description: Constants.per.authOnly, summary: "添加邮件" })
  public async add(@Body("email") email) {
    const userId = super.getUserId();
    await this.emailService.add(userId, email);
    return this.ok({});
  }

  @Post("/delete", { description: Constants.per.authOnly, summary: "删除邮件" })
  public async delete(@Body("email") email) {
    const userId = super.getUserId();
    await this.emailService.delete(userId, email);
    return this.ok({});
  }
}
