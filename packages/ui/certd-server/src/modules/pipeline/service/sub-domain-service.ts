import {Inject, Provide, Scope, ScopeEnum} from '@midwayjs/core';
import {BaseService, SysSettingsService} from '@certd/lib-server';
import {InjectEntityModel} from '@midwayjs/typeorm';
import {Repository} from 'typeorm';
import {SubDomainEntity} from '../entity/sub-domain.js';
import {EmailService} from '../../basic/service/email-service.js';

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

  async getListByUserId(userId:number):Promise<string[]>{
    if (!userId) {
      return [];
    }
    const list = await this.find({
      where: {
        userId,
        disabled: false,
      },
    });

    return list.map(item=>item.domain);
  }

  async add(bean: SubDomainEntity) {
    const {domain, userId} = bean;
    if (!domain) {
      throw new Error('域名不能为空');
    }
    if (!userId) {
      throw new Error('用户ID不能为空');
    }
    const exist = await this.repository.findOne({
      where: {
        domain,
        userId,
      },
    });
   if (exist) {
     throw new Error('域名已存在');
   }
   return await super.add(bean)
  }

}
