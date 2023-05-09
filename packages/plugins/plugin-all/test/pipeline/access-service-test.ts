import { IAccessService } from "@certd/pipeline";
import { AliyunAccess } from "@certd/plugin-aliyun";
import { aliyunSecret } from "../user.secret";
export class AccessServiceTest implements IAccessService {
  async getById(id: any): Promise<any> {
    return {
      ...aliyunSecret,
    } as AliyunAccess;
  }
}
