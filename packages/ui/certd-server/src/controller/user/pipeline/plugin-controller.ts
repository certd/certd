import { ALL, Body, Controller, Inject, Post, Provide, Query } from "@midwayjs/core";
import { BaseController, Constants } from "@certd/lib-server";
import { PluginService } from "../../../modules/plugin/service/plugin-service.js";
import { PluginConfigService } from "../../../modules/plugin/service/plugin-config-service.js";
import { pluginGroups } from "@certd/pipeline";
import { ApiTags } from "@midwayjs/swagger";

/**
 * 插件
 */
@Provide()
@Controller("/api/pi/plugin")
@ApiTags(["pipeline-plugin"])
export class PluginController extends BaseController {
  @Inject()
  service: PluginService;

  @Inject()
  pluginConfigService: PluginConfigService;

  @Post("/list", { description: Constants.per.authOnly, summary: "查询插件列表" })
  async list(@Query(ALL) query: any) {
    const list = await this.service.getEnabledBuiltInList();
    return this.ok(list);
  }

  @Post("/groups", { description: Constants.per.authOnly, summary: "查询插件分组" })
  async groups(@Query(ALL) query: any) {
    const group = await this.service.getEnabledBuildInGroup();
    return this.ok(group);
  }

  @Post("/groupsList", { description: Constants.per.authOnly, summary: "查询插件分组列表" })
  async groupsList(@Query(ALL) query: any) {
    const groups = pluginGroups;
    const groupsList: any = [];
    for (const key in groups) {
      const group = {
        ...groups[key],
      };
      delete group.plugins;
      groupsList.push(group);
    }
    return this.ok(groupsList);
  }

  @Post("/getDefineByType", { description: Constants.per.authOnly, summary: "根据类型获取插件定义" })
  async getDefineByType(@Body("type") type: string) {
    const define = await this.service.getDefineByType(type);
    return this.ok(define);
  }

  @Post("/config", { description: Constants.per.authOnly, summary: "获取插件配置" })
  async config(@Body(ALL) body: { id?: number; name?: string; type: string }) {
    const config = await this.pluginConfigService.getPluginConfig(body);
    return this.ok(config);
  }
}
