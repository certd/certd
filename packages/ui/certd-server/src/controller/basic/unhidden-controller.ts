import { Body, Controller, Get, Inject, Post, Provide } from "@midwayjs/core";
import { Constants, NotFoundException, ParamException, SysInstallInfo, SysSettingsService } from "@certd/lib-server";
import { utils } from "@certd/basic";
import { hiddenStatus, SafeService } from "../../modules/sys/settings/safe-service.js";
import { IMidwayKoaContext } from "@midwayjs/koa";

const unhiddenHtml = `
<html lang="en">
<head>
<title>certd解除站点隐藏</title>
</head>
<body>
<div style="margin:50px;width:500px">
<h3>解除站点隐藏</h3>
<form method="post">
请输入解除密码： <input type="password" name="password" /> <button type="submit">确定</button>
</form>
</div>
</body>
</html>

`;

@Provide()
@Controller("/api/unhidden")
export class UnhiddenController {
  @Inject()
  ctx: IMidwayKoaContext;
  @Inject()
  safeService: SafeService;
  @Inject()
  sysSettingsService: SysSettingsService;

  @Post("/:randomPath", { description: Constants.per.guest })
  async randomPath(@Body("password") password: any) {
    await this.checkUnhiddenPath();
    const hiddenSetting = await this.safeService.getHiddenSetting();
    if (utils.hash.md5(password) === hiddenSetting.openPassword) {
      //解锁
      hiddenStatus.isHidden = false;
      const setting = await this.sysSettingsService.getSetting<SysInstallInfo>(SysInstallInfo);
      const bindUrl = setting.bindUrl;
      //解锁成功,跳转回首页,redirect
      this.ctx.response.redirect(bindUrl || "/");
      return;
    } else {
      //密码错误
      throw new ParamException("解锁密码错误");
    }
  }

  @Get("/:randomPath", { description: Constants.per.guest })
  async unhiddenGet() {
    await this.checkUnhiddenPath();
    this.ctx.response.body = unhiddenHtml;
  }

  async checkUnhiddenPath() {
    const hiddenSetting = await this.safeService.getHiddenSetting();
    if (this.ctx.path != `/api/unhidden/${hiddenSetting.openPath}`) {
      this.ctx.res.statusCode = 404;
      throw new NotFoundException("Page not found");
    }
  }
}
