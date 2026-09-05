import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { FastlyAccess } from "../access.js";

@IsTaskPlugin({
  name: "FastlyPurgeCache",
  title: "Fastly-清除缓存",
  desc: "清除 Fastly 指定 Service 的所有缓存 (Purge All)",
  icon: "simple-icons:fastly",
  group: pluginGroups.cdn.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class FastlyPurgeCachePlugin extends AbstractTaskPlugin {
  @TaskInput({
    title: "Access授权",
    helper: "Fastly 授权凭证",
    component: {
      name: "access-selector",
      type: "fastly",
    },
    required: true,
  })
  accessId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "Service (服务)",
      helper: "选择要清理所有缓存的 Fastly 服务",
      action: FastlyPurgeCachePlugin.prototype.onGetServiceList.name,
      pager: false,
      search: false,
      required: true,
    })
  )
  serviceId!: string;

  async onInstance() {}

  async execute(): Promise<void> {
    const access = (await this.getAccess(this.accessId)) as FastlyAccess;

    if (!this.serviceId) {
      throw new Error("请选择要清理缓存的 Service");
    }

    this.logger.info(`开始清理 Fastly 服务 [${this.serviceId}] 的所有缓存...`);
    
    // POST /service/{service_id}/purge_all
    await access.doRequestApi(`/service/${this.serviceId}/purge_all`, {
      // empty body is acceptable for this endpoint, Fastly uses headers for auth
    }, "post");

    this.logger.info(`清理 Fastly 服务 [${this.serviceId}] 缓存成功`);
  }

  async onGetServiceList() {
    const access = (await this.getAccess(this.accessId)) as FastlyAccess;
    const services = await access.getServices();

    if (!services || services.length === 0) {
      return { list: [] };
    }

    const options = services.map((item: any) => {
      return {
        label: `${item.name} (${item.id})`,
        value: item.id,
      };
    });

    return { list: options };
  }
}

new FastlyPurgeCachePlugin();
