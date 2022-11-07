import { AbstractAccess, IAccessService } from "@certd/pipeline";
import { aliyunSecret } from "../user.secret";
export class AccessServiceTest implements IAccessService {
  async getById(id: any): Promise<AbstractAccess> {
    return {
      ...aliyunSecret,
    } as any;
  }
}
