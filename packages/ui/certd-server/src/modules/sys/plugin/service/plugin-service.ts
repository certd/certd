import { Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { BaseService } from '@certd/lib-server';
import { PluginEntity } from '../entity/plugin.js';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { checkComm } from '@certd/pipeline';

@Provide()
@Scope(ScopeEnum.Singleton)
export class PluginService extends BaseService<PluginEntity> {
  @InjectEntityModel(PluginEntity)
  repository: Repository<PluginEntity>;

  //@ts-ignore
  getRepository() {
    checkComm();
    return this.repository;
  }

  async setDisabled(id: number, disabled: boolean) {
    await this.repository.update({ id }, { disabled });
  }
}
