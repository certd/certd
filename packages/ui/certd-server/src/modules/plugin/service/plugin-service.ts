import { Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { BaseService, PageReq } from '@certd/lib-server';
import { PluginEntity } from '../entity/plugin.js';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { checkComm, isComm } from '@certd/pipeline';
import { BuiltInPluginService } from '../../pipeline/service/builtin-plugin-service.js';
import { merge } from 'lodash-es';

@Provide()
@Scope(ScopeEnum.Singleton)
export class PluginService extends BaseService<PluginEntity> {
  @InjectEntityModel(PluginEntity)
  repository: Repository<PluginEntity>;

  @Inject()
  builtInPluginService: BuiltInPluginService;

  //@ts-ignore
  getRepository() {
    checkComm();
    return this.repository;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async page(pageReq: PageReq<PluginEntity>) {
    const builtInList = await this.getBuiltInEntityList();
    return {
      records: builtInList,
      total: builtInList.length,
      offset: 0,
      limit: 99999,
    };
  }

  async getEnabledBuildInGroup() {
    const groups = this.builtInPluginService.getGroups();
    if (!isComm()) {
      return groups;
    }
    const list = await this.list({
      query: {
        type: 'builtIn',
        disabled: true,
      },
    });
    const disabledNames = list.map(it => it.name);
    for (const key in groups) {
      const group = groups[key];
      if (!group.plugins) {
        continue;
      }
      group.plugins = group.plugins.filter(it => !disabledNames.includes(it.name));
    }
    return groups;
  }
  async getEnabledBuiltInList(): Promise<any> {
    const builtInList = this.builtInPluginService.getList();
    if (!isComm()) {
      return builtInList;
    }

    const list = await this.list({
      query: {
        type: 'builtIn',
        disabled: true,
      },
    });
    const disabledNames = list.map(it => it.name);

    return builtInList.filter(it => !disabledNames.includes(it.name));
  }

  async getBuiltInEntityList() {
    const builtInList = this.builtInPluginService.getList();
    const list = await this.list({
      query: {
        type: 'builtIn',
      },
    });

    const records: PluginEntity[] = [];

    for (const item of builtInList) {
      let record = list.find(it => it.name === item.name);
      if (!record) {
        record = new PluginEntity();
        record.disabled = false;
      }
      merge(record, {
        name: item.name,
        title: item.title,
        type: 'builtIn',
        icon: item.icon,
        desc: item.desc,
        group: item.group,
      });
      records.push(record);
    }
    return records;
  }

  async setDisabled(opts: { id?: number; name?: string; type: string; disabled: boolean }) {
    const { id, name, type, disabled } = opts;
    if (!type) {
      throw new Error('参数错误: type 不能为空');
    }
    if (id > 0) {
      //update
      await this.repository.update({ id }, { disabled });
      return;
    }

    if (name && type === 'builtIn') {
      const pluginEntity = new PluginEntity();
      pluginEntity.name = name;
      pluginEntity.type = type;
      pluginEntity.disabled = disabled;
      await this.repository.save(pluginEntity);
      return;
    }
    throw new Error('参数错误: id 和 name 必须有一个');
  }
}
