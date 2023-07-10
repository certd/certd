import { EmailSend, IAccessService, IEmailService } from "@certd/pipeline";
import { AliyunAccess } from "@certd/plugin-aliyun";
import { aliyunSecret } from "../user.secret";

export class AccessServiceTest implements IAccessService {
  async getById(id: any): Promise<any> {
    return {
      ...aliyunSecret,
    } as AliyunAccess;
  }
}

export class EmailServiceTest implements IEmailService {
  send(email: EmailSend): Promise<void> {
    console.log("send email", email);
    return Promise.resolve(undefined);
  }
}
