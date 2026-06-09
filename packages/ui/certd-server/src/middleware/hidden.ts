import { Inject, Provide } from "@midwayjs/core";
import { IMidwayKoaContext, IWebMiddleware, NextFunction } from "@midwayjs/koa";
import { hiddenStatus, SafeService } from "../modules/sys/settings/safe-service.js";
import { SiteOffException } from "@certd/lib-server";

/**
 * 隐藏环境
 */
@Provide()
export class HiddenMiddleware implements IWebMiddleware {
  @Inject()
  hiddenService: SafeService;

  resolve() {
    return async (ctx: IMidwayKoaContext, next: NextFunction) => {
      async function pass() {
        hiddenStatus.updateRequestTime();
        await next();
      }

      const hiddenSetting = await this.hiddenService.getHiddenSetting();
      if (!hiddenSetting || !hiddenSetting?.enabled) {
        //未开启站点隐藏，直接通过
        return await pass();
      }

      const req = ctx.request;
      if (hiddenSetting.hiddenOpenApi === false && req.url.startsWith(`/api/v1/`)) {
        //不隐藏开放接口
        await next();
        return;
      }

      //判断当前是否是隐藏状态
      if (!hiddenStatus.isHidden) {
        return await pass();
      }

      //判断是否有解锁文件,如果有就返回true并删除文件
      if (hiddenStatus.hasUnHiddenFile()) {
        //临时修改为未隐藏
        hiddenStatus.isHidden = false;
        return await pass();
      }

      if (req.url === `/api/unhidden/${hiddenSetting.openPath}`) {
        return await pass();
      }
      throw new SiteOffException("此站点已关闭");
    };
  }
}
