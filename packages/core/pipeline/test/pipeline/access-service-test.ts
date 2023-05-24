import { IAccess, IAccessService } from "../../src";
// @ts-ignore
import { aliyunSecret } from "../user.secret";
export class AccessServiceTest implements IAccessService {
  async getById(id: any): Promise<IAccess> {
    return {
      ...aliyunSecret,
    } as any;
  }
}
