import { Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { In, Repository } from "typeorm";
import { AddonDefine, BaseService, PageReq, ValidateException } from "../../../index.js";
import { addonRegistry } from "../api/index.js";
import { AddonEntity } from "../entity/addon.js";
import { utils } from "@certd/basic";

/**
 * Addon
 */
@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class AddonService extends BaseService<AddonEntity> {
  @InjectEntityModel(AddonEntity)
  repository: Repository<AddonEntity>;

  //@ts-ignore
  getRepository() {
    return this.repository;
  }

  async page(pageReq: PageReq<AddonEntity>) {
    const res = await super.page(pageReq);
    res.records = res.records.map(item => {
      return item;
    });
    return res;
  }

  async add(param) {
    let oldEntity = null;
    if (param._copyFrom) {
      oldEntity = await this.info(param._copyFrom);
      if (oldEntity == null) {
        throw new ValidateException("该Addon配置不存在,请确认是否已被删除");
      }
      if (oldEntity.userId !== param.userId) {
        throw new ValidateException("您无权查看该Addon配置");
      }
    }
    if (!param.userId) {
      param.isSystem = true;
    } else {
      param.isSystem = false;
    }
    param.keyId = "ad_" + utils.id.simpleNanoId();
    delete param._copyFrom;
    return await super.add(param);
  }


  /**
   * 修改
   * @param param 数据
   */
  async update(param) {
    const oldEntity = await this.info(param.id);
    if (oldEntity == null) {
      throw new ValidateException("该Addon配置不存在,请确认是否已被删除");
    }
    delete param.keyId
    return await super.update(param);
  }

  async getSimpleInfo(id: number) {
    const entity = await this.info(id);
    if (entity == null) {
      throw new ValidateException("该Addon配置不存在,请确认是否已被删除");
    }
    return {
      id: entity.id,
      keyId: entity.keyId,
      name: entity.name,
      userId: entity.userId,
      addonType: entity.addonType,
      type: entity.type,
      projectId: entity.projectId
    };
  }


  getDefineList(addonType: string) {
    return addonRegistry.getDefineList(addonType);
  }

  getDefineByType(type: string, prefix?: string) {
    return addonRegistry.getDefine(type, prefix) as AddonDefine;
  }


  async getSimpleByIds(ids: number[], userId: any,projectId?:number) {
    if (ids.length === 0) {
      return [];
    }
    if (userId==null) {
      return [];
    }
    return await this.repository.find({
      where: {
        id: In(ids),
        userId,
        projectId
      },
      select: {
        id: true,
        keyId: true,
        name: true,
        addonType: true,
        type: true,
        userId: true,
        isSystem: true
      }
    });

  }


  async getDefault(userId: number, addonType: string,projectId?:number): Promise<any> {
    const res = await this.repository.findOne({
      where: {
        userId,
        addonType,
        projectId
      },
      order: {
        isDefault: "DESC"
      }
    });
    if (!res) {
      return null;
    }
    return this.buildAddonInstanceConfig(res);
  }

  private buildAddonInstanceConfig(res: AddonEntity) {
    const setting = JSON.parse(res.setting);
    return {
      id: res.id,
      keyId: res.keyId,
      addonType: res.addonType,
      type: res.type,
      name: res.name,
      userId: res.userId,
      setting,
      projectId: res.projectId
    };
  }

  async setDefault(id: number, userId: number, addonType: string,projectId?:number) {
    if (!id) {
      throw new ValidateException("id不能为空");
    }
    if (userId==null) {
      throw new ValidateException("userId不能为空");
    }
    await this.repository.update(
      {
        userId,
        addonType,
        projectId
      },
      {
        isDefault: false
      }
    );
    await this.repository.update(
      {
        id,
        userId,
        addonType,
        projectId
      },
      {
        isDefault: true
      }
    );
  }

  async getOrCreateDefault(opts: { addonType: string, type: string, inputs: any, userId: any,projectId?:number }) {
    const { addonType, type, inputs, userId,projectId } = opts;

    const addonDefine = this.getDefineByType(type, addonType);

    const defaultConfig = await this.getDefault(userId, addonType,projectId);
    if (defaultConfig) {
      return defaultConfig;
    }
    const setting = {
      ...inputs
    };
    const res = await this.repository.save({
      userId,
      addonType,
      type: type,
      name: addonDefine.title,
      setting: JSON.stringify(setting),
      isDefault: true,
      projectId
    });
    return this.buildAddonInstanceConfig(res);
  }

  async getOneByType(req:{addonType:string,type:string,userId:number,projectId?:number}) {
    return await this.repository.findOne({
      where: {
        addonType: req.addonType,
        type: req.type,
        userId: req.userId,
        projectId: req.projectId
      }
    });
  }
}
