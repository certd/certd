import { Provide, Scope, ScopeEnum } from "@midwayjs/decorator";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { Repository } from "typeorm";
import { BaseService } from "../../../basic/base-service";
import { SettingsEntity } from "../entity/settings";

/**
 * 授权
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class SettingsService
  extends BaseService<SettingsEntity>
{
  @InjectEntityModel(SettingsEntity)
  repository: Repository<SettingsEntity>;

  getRepository() {
    return this.repository;
  }

  async getById(id: any): Promise<any> {
    const entity = await this.info(id);
    // const access = accessRegistry.get(entity.type);
    const setting = JSON.parse(entity.setting);
    return {
      id: entity.id,
      ...setting,
    };
  }


}
