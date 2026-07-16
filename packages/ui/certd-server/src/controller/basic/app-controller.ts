import { Body, Controller, Get, Inject, Post, Provide } from "@midwayjs/core";
import { BaseController, Constants, FileService, SysSettingsService, SysSiteInfo } from "@certd/lib-server";
import { http, logger } from "@certd/basic";
import { isComm } from "@certd/plus-core";

export function normalizeReleaseVersion(release: { tag_name?: string; name?: string }) {
  const version = release?.tag_name || release?.name || "";
  return version.replace(/^v/i, "");
}

export function getReleaseMode(): "stable" | "latest" {
  return process.env.certd_release_mode === "stable" ? "stable" : "latest";
}

/**
 */
@Provide()
@Controller("/api/app/")
export class AppController extends BaseController {
  @Inject()
  sysSettingsService: SysSettingsService;
  @Inject()
  fileService: FileService;

  @Get("/latest", { description: Constants.per.authOnly })
  async latest(): Promise<any> {
    const mode = getReleaseMode();
    try {
      let latest = "";
      if (mode === "stable") {
        // 稳定版: 查询被设为 latest 的正式版本
        const res = await http.request({
          url: "https://api.atomgit.com/api/v5/repos/certd/certd/releases/latest?type=latest",
          method: "get",
          logRes: false,
          timeout: 5000,
        });
        latest = normalizeReleaseVersion(res);
      } else {
        // 预览版: 获取最新一条 release（可能包含 pre-release）
        const list = await http.request({
          url: "https://api.atomgit.com/api/v5/repos/certd/certd/releases/?direction=desc&per_page=1",
          method: "get",
          logRes: false,
          timeout: 5000,
        });
        if (Array.isArray(list) && list.length > 0) {
          latest = normalizeReleaseVersion(list[0]);
        }
      }
      return this.ok(latest);
    } catch (e: any) {
      logger.error(e);
      return this.ok("");
    }
  }

  @Get("/favicon", { description: Constants.per.guest })
  public async getFavicon() {
    if (isComm()) {
      const siteInfo = await this.sysSettingsService.getSetting<SysSiteInfo>(SysSiteInfo);
      const favicon = siteInfo.logo;
      if (favicon) {
        const redirect = "/api/basic/file/download?key=" + favicon;
        this.ctx.response.redirect(redirect);
        this.ctx.response.set("Cache-Control", "public,max-age=25920");
        return;
      }
    }
    const redirect = "/static/images/logo/logo.svg";
    this.ctx.response.redirect(redirect);
    this.ctx.response.set("Cache-Control", "public,max-age=25920");
  }

  @Post("/webhook", { description: Constants.per.guest })
  public async webhook(@Body() body: any) {
    logger.info("webhook", JSON.stringify(body));
    return this.ok("success");
  }
}
