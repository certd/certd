import { IAccessService } from "../../src/access/access-service";
import { AbstractAccess, HuaweiAccess } from "../../src";
import { aliyunSecret } from "../user.secret";
export class AccessServiceTest implements IAccessService {
  async getById(id: any): Promise<AbstractAccess> {
    return {
      ...aliyunSecret,
    } as HuaweiAccess;
  }
}
