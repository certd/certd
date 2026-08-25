import { notification } from "ant-design-vue";
import * as api from "./api";
import { usePluginStore } from "/@/store/plugin";
import { useI18n } from "/src/locales";

/**
 * 在线插件的完整标识（author/name）。
 */
export function fullNameValueFor(plugin: any) {
  return (plugin?.fullName || (plugin?.author && plugin?.name ? `${plugin.author}/${plugin.name}` : "")).trim();
}

export function isOnlinePluginMissing(error: unknown) {
  return error instanceof Error && error.message.includes("插件不存在");
}

/**
 * 在线插件依赖解析与安装，供插件卡片、详情弹窗等安装入口复用。
 * 依赖 key 格式：内置插件用 type:name（如 access:aliyun），市场插件用 type:author/name（如 access:greper/hostAccess）。
 */
export function useOnlineInstall() {
  const { t } = useI18n();
  const pluginStore = usePluginStore();
  function openDependencyDetail(item: any) {
    window.dispatchEvent(new CustomEvent("certd:plugin-detail", { detail: item }));
  }

  /**
   * 解析插件依赖树（DFS + 循环检测），返回需要先安装的依赖列表（依赖序，已满足的除外）。
   * 本地同步数据缺失时，会从平台实时获取插件声明的依赖。
   */
  async function resolveOnlinePluginDependencies(target: any) {
    const fullName = fullNameValueFor(target);
    if (!fullName) {
      return [];
    }
    return await api.OnlinePluginDependencies(fullName);
  }

  /**
   * 按依赖序安装：先装依赖，再装目标插件；options.version 可指定目标插件版本（详情弹窗安装指定版本场景）。
   */
  async function installOnlinePluginChain(dependencies: any[], target: any, options?: { version?: string; silent?: boolean }) {
    for (const dependency of dependencies) {
      const result = await installOnlinePluginRecord(dependency);
      dependency.installed = true;
      dependency.version = result.version;
    }
    const result = await installOnlinePluginRecord(target, options?.version);
    target.installed = true;
    target.version = result.version;
    if (!options?.silent) {
      await pluginStore.reload();
      notification.success({ message: t("certd.onlinePluginInstallSuccess") });
    }
  }

  async function installOnlinePluginRecord(record: any, versionOverride?: string) {
    const fullName = fullNameValueFor(record);
    if (!fullName) {
      throw new Error(t("certd.onlinePluginDependencyNotFound"));
    }
    const version = versionOverride || record.latest;
    await api.OnlinePluginInstall(
      {
        fullName,
        version,
      },
      {
        showErrorNotify: false,
      }
    );
    return { version };
  }

  return {
    resolveOnlinePluginDependencies,
    installOnlinePluginChain,
    installOnlinePluginRecord,
    openDependencyDetail,
  };
}

/**
 * 版本号比较：current > required 返回 1，相等返回 0，小于返回 -1。
 */
export function compareVersions(current?: string, required?: string) {
  const normalize = (version?: string) => (version || "").trim().replace(/^[vV]/, "");
  const currentParts = normalize(current).split(".");
  const requiredParts = normalize(required).split(".");
  const maxLength = Math.max(currentParts.length, requiredParts.length);
  for (let index = 0; index < maxLength; index++) {
    const currentPart = Number(currentParts[index] || 0);
    const requiredPart = Number(requiredParts[index] || 0);
    if (!Number.isInteger(currentPart) || !Number.isInteger(requiredPart)) {
      return 0;
    }
    if (currentPart > requiredPart) {
      return 1;
    }
    if (currentPart < requiredPart) {
      return -1;
    }
  }
  return 0;
}
