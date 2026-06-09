import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { In, Repository } from "typeorm";
import { AccessGetter, BaseService, PageReq, PermissionException, ValidateException } from "../../../index.js";
import { AccessEntity } from "../entity/access.js";
import { AccessDefine, accessRegistry, newAccess } from "@certd/pipeline";
import { EncryptService } from "./encrypt-service.js";
import { logger, utils } from "@certd/basic";

/**
 * 授权
 */
@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class AccessService extends BaseService<AccessEntity> {
  @InjectEntityModel(AccessEntity)
  repository: Repository<AccessEntity>;

  @Inject()
  encryptService: EncryptService;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  getRepository() {
    return this.repository;
  }

  async page(pageReq: PageReq<AccessEntity>) {
    const res = await super.page(pageReq);
    res.records = res.records.map(item => {
      delete item.encryptSetting;
      return item;
    });
    return res;
  }

  async add(param) {
    let oldEntity = null;
    if (param._copyFrom) {
      oldEntity = await this.info(param._copyFrom);
      if (oldEntity == null) {
        throw new ValidateException("该授权配置不存在,请确认是否已被删除");
      }
      if (oldEntity.userId !== param.userId) {
        throw new ValidateException("您无权查看该授权配置");
      }
    }
    delete param._copyFrom;
    this.encryptSetting(param, oldEntity);
    param.keyId = "ac_" + utils.id.simpleNanoId();
    return await super.add(param);
  }

  encryptSetting(param: any, oldSettingEntity?: AccessEntity) {
    const accessType = param.type;
    const accessDefine: AccessDefine = accessRegistry.getDefine(accessType);
    if (!accessDefine) {
      throw new ValidateException(`授权类型${accessType}不存在`);
    }
    const setting = param.setting;
    if (!setting) {
      return;
    }
    const json = JSON.parse(setting);
    if (accessDefine.subtype) {
      param.subtype = json[accessDefine.subtype] || null;
    }
    let oldSetting = {};
    let encryptSetting = {};
    const firstEncrypt = !oldSettingEntity || !oldSettingEntity.encryptSetting || oldSettingEntity.encryptSetting === "{}";
    if (oldSettingEntity) {
      oldSetting = JSON.parse(oldSettingEntity.setting || "{}");
      encryptSetting = JSON.parse(oldSettingEntity.encryptSetting || "{}");
    }
    for (const key in json) {
      //加密
      let value = json[key];
      if (value && typeof value === "string") {
        //去除前后空格
        value = value.trim();
        json[key] = value;
      }
      const accessInputDefine = accessDefine.input[key];
      if (!accessInputDefine) {
        continue;
      }
      if (!accessInputDefine.encrypt || !value || typeof value !== "string") {
        //定义无需加密、value为空、不是字符串 这些不需要加密
        encryptSetting[key] = {
          value: value,
          encrypt: false,
        };
        continue;
      }

      if (firstEncrypt || oldSetting[key] !== value) {
        //星号保护
        const length = value.length;
        const subIndex = Math.min(2, length);
        let starLength = length - subIndex * 2;
        starLength = Math.max(2, starLength);
        const starString = "*".repeat(starLength);
        json[key] = value.substring(0, subIndex) + starString + value.substring(value.length - subIndex);
        encryptSetting[key] = {
          value: this.encryptService.encrypt(value),
          encrypt: true,
        };
      }
      //未改变情况下，不做修改
    }
    param.encryptSetting = JSON.stringify(encryptSetting);
    param.setting = JSON.stringify(json);
  }

  /**
   * 修改
   * @param param 数据
   */
  async update(param) {
    const oldEntity = await this.info(param.id);
    if (oldEntity == null) {
      throw new ValidateException("该授权配置不存在,请确认是否已被删除");
    }
    this.encryptSetting(param, oldEntity);
    delete param.keyId;
    return await super.update(param);
  }

  async updateAccess(access: any) {
    const oldEntity = await this.info(access.id);
    if (oldEntity == null) {
      throw new ValidateException("该授权配置不存在,请确认是否已被删除");
    }
    const setting = this.decryptAccessEntity(oldEntity);
    for (const key of Object.keys(access)) {
      if (key === "id") {
        continue;
      }
      setting[key] = access[key];
    }
    return await this.update({
      id: access.id,
      type: oldEntity.type,
      setting: JSON.stringify(setting),
    });
  }

  async getSimpleInfo(id: number) {
    const entity = await this.info(id);
    if (entity == null) {
      throw new ValidateException("该授权配置不存在,请确认是否已被删除");
    }
    return {
      id: entity.id,
      name: entity.name,
      type: entity.type,
      subtype: entity.subtype,
      userId: entity.userId,
      projectId: entity.projectId,
    };
  }

  async getAccessById(id: any, checkUserId: boolean, userId?: number, projectId?: number): Promise<any> {
    const entity = await this.info(id);
    if (entity == null) {
      throw new Error(`该授权配置不存在,请确认是否已被删除:id=${id}`);
    }
    if (checkUserId) {
      if (userId == null) {
        throw new ValidateException("userId不能为空");
      }
      if (userId !== entity.userId) {
        throw new PermissionException("您对该Access授权无访问权限");
      }
    }
    if (projectId != null && projectId !== entity.projectId) {
      throw new PermissionException("您对该Access授权无访问权限");
    }

    // const access = accessRegistry.get(entity.type);
    const setting = this.decryptAccessEntity(entity);
    const input = {
      id: entity.id,
      ...setting,
    };
    const accessGetter = new AccessGetter(userId, projectId, this.getById.bind(this));
    return await newAccess(entity.type, input, accessGetter);
  }

  async getById(id: any, userId: number, projectId?: number): Promise<any> {
    return await this.getAccessById(id, true, userId, projectId);
  }

  decryptAccessEntity(entity: AccessEntity): any {
    let setting = {};
    if (entity.encryptSetting && entity.encryptSetting !== "{}") {
      setting = JSON.parse(entity.encryptSetting);
      for (const key in setting) {
        //解密
        const encryptValue = setting[key];
        let value = encryptValue.value;
        if (encryptValue.encrypt) {
          value = this.encryptService.decrypt(value);
        }
        setting[key] = value;
      }
    } else if (entity.setting) {
      setting = JSON.parse(entity.setting);
    }
    return setting;
  }

  getDefineList() {
    return accessRegistry.getDefineList();
  }

  getDefineByType(type: string) {
    return accessRegistry.getDefine(type);
  }

  async getSimpleByIds(ids: number[], userId: any, projectId?: number) {
    if (ids.length === 0) {
      return [];
    }
    if (userId == null) {
      return [];
    }
    const userProjectQuery = this.buildUserProjectQuery(userId, projectId);
    return await this.repository.find({
      where: {
        id: In(ids),
        ...userProjectQuery,
      },
      select: {
        id: true,
        name: true,
        type: true,
        subtype: true,
        userId: true,
        projectId: true,
      },
    });
  }

  /**
   * 复制授权到其他项目
   * @param accessId
   * @param projectId
   */
  async copyTo(accessId: number, projectId?: number) {
    const access = await this.info(accessId);
    if (access == null) {
      throw new Error(`该授权配置不存在,请确认是否已被删除:id=${accessId}`);
    }

    const keyId = access.keyId;
    //检查目标项目里是否已经有相同keyId的配置
    const existAccess = await this.repository.findOne({
      where: {
        keyId,
        projectId,
      },
    });
    if (existAccess) {
      logger.info(`目标项目已存在相同keyId的授权配置,跳过复制:keyId=${keyId}`);
      return existAccess.id;
    }
    const newAccess = {
      ...access,
      userId: -1,
      id: undefined,
      projectId,
    };
    await this.repository.save(newAccess);
    return newAccess.id;
  }
}
