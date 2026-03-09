import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { http, logger, utils } from "@certd/basic";
import { TaskServiceBuilder } from "./getter/task-service-getter.js";
import { AddonService, newAddon, PermissionException, ValidateException } from "@certd/lib-server";

/**
 * Addon
 */
@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class AddonGetterService  {

  @Inject()
  taskServiceBuilder: TaskServiceBuilder;
  @Inject()
  addonService: AddonService;


  async getAddonById(id: any, checkUserId: boolean, userId?: number, projectId?: number, defaultAddon?:{type:string,name:string} ): Promise<any> {
    const serviceGetter = this.taskServiceBuilder.create({
      userId,
      projectId,
    });
    const ctx = {
      http,
      logger,
      utils,
      serviceGetter
    }

    if (!id) {
      if (!defaultAddon) {
        return null;
      }
      return await newAddon(defaultAddon.type, defaultAddon.name, {}, ctx);
    }
    const entity = await this.addonService.info(id);
    if (entity == null) {
      if (!defaultAddon) {
        return null;
      }
      return await newAddon(defaultAddon.type, defaultAddon.name, {}, ctx);
    }
    if (checkUserId) {
      if (userId == null) {
        throw new ValidateException("userId不能为空");
      }
      if (userId !== entity.userId) {
        throw new PermissionException("您对该Addon无访问权限");
      }
    }

    const setting = JSON.parse(entity.setting ?? "{}");
    const input = {
      id: entity.id,
      ...setting
    };

    return await newAddon(entity.addonType, entity.type, input, ctx);
  }

  async getById(id: any, userId: number, projectId?: number): Promise<any> {
    return await this.getAddonById(id, true, userId, projectId);
  }


  async getBlank(addonType:string,subType:string,projectId?: number){
    return await this.getAddonById(null,false,0,projectId,{
      type: addonType, name:subType
    })
  }

}
