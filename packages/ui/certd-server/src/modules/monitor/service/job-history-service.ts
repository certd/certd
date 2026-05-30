import { BaseService } from "@certd/lib-server";
import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { Repository } from "typeorm";
import { UserSettingsService } from "../../mine/service/user-settings-service.js";
import { JobHistoryEntity } from "../entity/job-history.js";

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class JobHistoryService extends BaseService<JobHistoryEntity> {
  @InjectEntityModel(JobHistoryEntity)
  repository: Repository<JobHistoryEntity>;

  @Inject()
  userSettingsService: UserSettingsService;

  //@ts-ignore
  getRepository() {
    return this.repository;
  }
}
