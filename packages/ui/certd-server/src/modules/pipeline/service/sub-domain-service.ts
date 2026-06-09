import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { BaseService, SysSettingsService } from "@certd/lib-server";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { Repository } from "typeorm";
import { SubDomainEntity } from "../entity/sub-domain.js";
import { EmailService } from "../../basic/service/email-service.js";

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class SubDomainService extends BaseService<SubDomainEntity> {
  @InjectEntityModel(SubDomainEntity)
  repository: Repository<SubDomainEntity>;

  @Inject()
  emailService: EmailService;

  @Inject()
  sysSettingsService: SysSettingsService;

  //@ts-ignore
  getRepository() {
    return this.repository;
  }

  async getListByUserId(userId: number, projectId?: number): Promise<string[]> {
    if (userId == null) {
      return [];
    }
    const userProjectQuery = this.buildUserProjectQuery(userId, projectId);
    const list = await this.find({
      where: {
        ...userProjectQuery,
        disabled: false,
      },
    });

    return list.map(item => item.domain);
  }

  async add(bean: SubDomainEntity) {
    const { domain, userId, projectId } = bean;
    if (!domain) {
      throw new Error("域名不能为空");
    }
    if (userId == null) {
      throw new Error("用户ID不能为空");
    }
    const userProjectQuery = this.buildUserProjectQuery(userId, projectId);
    const exist = await this.repository.findOne({
      where: {
        domain,
        ...userProjectQuery,
      },
    });
    if (exist) {
      throw new Error("域名已存在");
    }
    return await super.add(bean);
  }
}
