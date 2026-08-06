import { IAccessService } from "@certd/pipeline";
import { AccessService } from "./access-service.js";

export class AccessSysGetter implements IAccessService {
  accessService: AccessService;
  constructor(accessService: AccessService) {
    this.accessService = accessService;
  }

  async getById<T = any>(id: any) {
    return await this.accessService.getAccessById(id, false);
  }

  async getCommonById<T = any>(id: any) {
    return await this.accessService.getAccessById(id, false);
  }
}
