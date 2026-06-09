import { BaseService, SysSettingsService } from "@certd/lib-server";
import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { Repository } from "typeorm";
import { OauthBoundEntity } from "../entity/oauth-bound.js";

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class OauthBoundService extends BaseService<OauthBoundEntity> {
  @InjectEntityModel(OauthBoundEntity)
  repository: Repository<OauthBoundEntity>;

  @Inject()
  sysSettingsService: SysSettingsService;

  //@ts-ignore
  getRepository() {
    return this.repository;
  }

  async unbind(req: { userId: any; type: any }) {
    const { userId, type } = req;
    if (!userId || !type) {
      throw new Error("参数错误");
    }

    await this.repository.delete({
      userId,
      type,
    });
  }

  async bind(req: { userId: any; type: any; openId: any }) {
    const { userId, type, openId } = req;
    if (!userId || !type || !openId) {
      throw new Error("参数错误");
    }
    const exist = await this.repository.findOne({
      where: {
        openId,
        type,
      },
    });
    if (exist) {
      if (exist.userId === userId) {
        return;
      }
      throw new Error("该第三方账号已绑定其他用户");
    }

    const exist2 = await this.repository.findOne({
      where: {
        userId,
        type,
      },
    });
    if (exist2) {
      //覆盖绑定
      exist2.openId = openId;
      await this.update({
        id: exist2.id,
        openId,
      });
      return;
    }
    //新增
    await this.add({
      userId,
      type,
      openId,
    });
  }
}
