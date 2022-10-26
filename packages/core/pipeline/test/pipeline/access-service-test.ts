import { IAccessService } from "../../src/access/access-service";
import { AbstractAccess, AliyunAccess } from "../../src";
import { aliyunSecret } from "../user.secret";
export class AccessServiceTest implements IAccessService {
  getById(id: any): AbstractAccess {
    return {
      ...aliyunSecret,
    } as AliyunAccess;
  }
}
