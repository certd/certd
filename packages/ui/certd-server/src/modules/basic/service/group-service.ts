import { Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { BaseService } from "@certd/lib-server";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { Repository } from "typeorm";
import { merge } from "lodash-es";
import { GroupEntity } from "../entity/group.js";

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class GroupService extends BaseService<GroupEntity> {
  @InjectEntityModel(GroupEntity)
  repository: Repository<GroupEntity>;

  //@ts-ignore
  getRepository() {
    return this.repository;
  }

  async add(bean: any) {
    if (!bean.type) {
      throw new Error("type is required");
    }
    bean = merge(
      {
        favorite: false,
      },
      bean
    );
    return await this.repository.save(bean);
  }
}
