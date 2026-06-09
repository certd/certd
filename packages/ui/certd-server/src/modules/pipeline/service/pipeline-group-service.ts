import { Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { BaseService } from "@certd/lib-server";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { Repository } from "typeorm";
import { PipelineGroupEntity } from "../entity/pipeline-group.js";
import { merge } from "lodash-es";

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class PipelineGroupService extends BaseService<PipelineGroupEntity> {
  @InjectEntityModel(PipelineGroupEntity)
  repository: Repository<PipelineGroupEntity>;

  //@ts-ignore
  getRepository() {
    return this.repository;
  }

  async add(bean: any) {
    bean = merge(
      {
        favorite: false,
      },
      bean
    );
    return await this.repository.save(bean);
  }
}
