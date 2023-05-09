import { IAccessService } from "@certd/pipeline";
import { hauweiSecret } from "../user.secret";
import { HuaweiAccess } from "@certd/plugin-huawei";
export class AccessServiceTest implements IAccessService {
  async getById(id: any): Promise<any> {
    return {
      ...hauweiSecret,
    } as HuaweiAccess;
  }
}
