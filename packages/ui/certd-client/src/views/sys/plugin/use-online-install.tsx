import { notification } from "ant-design-vue";
import * as api from "./api";
import { usePluginStore } from "/@/store/plugin";
import { useFormDialog } from "/@/use/use-dialog";
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
  const { openFormDialog } = useFormDialog();

  /**
   * 动态打开插件详情对话框（openFormDialog 渲染，不依赖模板嵌套组件）。
   */
  function openDependencyDetail(item: any) {
    openFormDialog({
      title: `${item.title || item.name || item.fullName} - 插件详情`,
      columns: {},
      noneForm: true,
      className: "plugin-dependency-detail-dialog",
      wrapper: {
        width: 640,
        destroyOnClose: true,
        maskClosable: true,
        okText: t("certd.confirm"),
        cancelText: t("certd.cancel"),
      },
      body: () => (
        <div class="plugin-dependency-detail">
          <div class="plugin-dependency-detail__item">
            <span class="plugin-dependency-detail__label">{t("certd.pluginName")}</span>
            <span>{item.title || item.name || "-"}</span>
          </div>
          <div class="plugin-dependency-detail__item">
            <span class="plugin-dependency-detail__label">{t("certd.author")}</span>
            <span>{item.author || "-"}</span>
          </div>
          <div class="plugin-dependency-detail__item">
            <span class="plugin-dependency-detail__label">完整标识</span>
            <span>{fullNameValueFor(item) || "-"}</span>
          </div>
          <div class="plugin-dependency-detail__item">
            <span class="plugin-dependency-detail__label">{t("certd.pluginType")}</span>
            <span>{item.pluginType || "-"}</span>
          </div>
          <div class="plugin-dependency-detail__item">
            <span class="plugin-dependency-detail__label">{t("certd.version")}</span>
            <span>{item.version || item.latest || "-"}</span>
          </div>
          <div class="plugin-dependency-detail__item">
            <span class="plugin-dependency-detail__label">{t("certd.desc")}</span>
            <span>{item.desc || "-"}</span>
          </div>
        </div>
      ),
      async onSubmit() {},
    });
  }

  /**
   * 解析插件依赖树（DFS + 循环检测），返回需要先安装的依赖列表（依赖序，已满足的除外）。
   * 本地同步数据缺失时，会从平台实时获取插件声明的依赖。
   */
  async function resolveOnlinePluginDependencies(target: any) {
    const declared = target?.dependPlugins || {};
    if (!declared || typeof declared !== "object" || Object.keys(declared).length === 0) {
      return [];
    }
    // 确保本地插件注册表已加载，用于判断依赖是否已被本地内置/已安装插件满足
    await pluginStore.init();
    const marketList = await api.OnlinePluginList({});
    const records = [target, ...(marketList || [])];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const ordered: any[] = [];

    const visit = (record: any, requirement?: string) => {
      const identity = fullNameValueFor(record);
      if (!identity || visited.has(identity)) {
        return;
      }
      // 目标插件自身即使已安装（升级场景）也要继续向下解析依赖；
      // 已满足的依赖（已安装且版本达标，或由本地内置插件提供）直接跳过
      if (record !== target && dependencySatisfied(record, requirement)) {
        return;
      }
      if (visiting.has(identity)) {
        throw new Error(t("certd.onlinePluginDependencyCycle", { name: identity }));
      }
      visiting.add(identity);
      const dependencies = record?.dependPlugins || {};
      for (const [dependencyKey, dependencyVersion] of Object.entries(dependencies)) {
        const dependency = findOnlineDependency(records, dependencyKey, dependencyVersion as string);
        if (!dependency) {
          throw new Error(`${t("certd.onlinePluginDependencyNotFound")}: ${dependencyKey}`);
        }
        visit(dependency, dependencyVersion as string);
      }
      visiting.delete(identity);
      visited.add(identity);
      if (record !== target && !record.installed) {
        ordered.push(record);
      }
    };

    visit(target);
    return ordered;
  }

  /**
   * 按依赖序安装：先装依赖，再装目标插件；options.version 可指定目标插件版本（详情弹窗安装指定版本场景）。
   */
  async function installOnlinePluginChain(dependencies: any[], target: any, options?: { version?: string }) {
    for (const dependency of dependencies) {
      await installOnlinePluginRecord(dependency);
    }
    await installOnlinePluginRecord(target, options?.version);
    await pluginStore.reload();
    notification.success({ message: t("certd.onlinePluginInstallSuccess") });
  }

  async function installOnlinePluginRecord(record: any, versionOverride?: string) {
    const fullName = fullNameValueFor(record);
    if (!fullName) {
      throw new Error(t("certd.onlinePluginDependencyNotFound"));
    }
    const requirement = record.__dependencyVersion;
    // requirement 只会是具体版本号或 "*"（完整标识匹配时已归一化为 "*"），不会把标识当版本号传
    const version = versionOverride || (requirement && requirement !== "*" ? requirement : record.latest);
    await api.OnlinePluginInstall(
      {
        fullName,
        version,
      },
      {
        showErrorNotify: false,
      }
    );
  }

  function findOnlineDependency(records: any[], dependencyKey: string, dependencyVersion: string) {
    // 1) 依赖值直接是插件完整标识（如 tencent/TestAccess）：按 fullName 精确匹配
    const direct = records.find(item => fullNameValueFor(item) === dependencyVersion);
    if (direct) {
      // 值是完整标识而非版本号，安装时取该插件最新版本
      direct.__dependencyVersion = "*";
      return direct;
    }
    const parts = dependencyKey.split(":");
    // 分割出类型前缀（如 access/plugin/dnsProvider/notification/addon），剩下的可能是
    // 纯插件名（内置插件），也可能是 author/name 完整标识（市场插件）
    const dependencyType = parts.length > 1 ? parts[0] : "";
    const dependencyRef = parts.length > 1 ? parts[parts.length - 1] : dependencyKey;
    const typeMatches = (item: any) => !dependencyType || item.pluginType === dependencyType || (dependencyType === "plugin" && item.pluginType === "deploy");
    // 2) 按完整标识匹配（type:author/name），并校验插件类型与类型前缀一致
    const byFullName = records.find(item => typeMatches(item) && fullNameValueFor(item) === dependencyRef);
    if (byFullName) {
      byFullName.__dependencyVersion = dependencyVersion;
      return byFullName;
    }
    // 3) 再按 type + 纯插件名匹配（内置插件或省略作者的依赖）
    const dependencyName = dependencyRef.includes("/") ? dependencyRef.slice(dependencyRef.lastIndexOf("/") + 1) : dependencyRef;
    const record = records.find(item => typeMatches(item) && item.name === dependencyName);
    if (record) {
      // 按 type:name 匹配时，依赖值视为版本要求（* 或具体版本号）
      record.__dependencyVersion = dependencyVersion;
      return record;
    }
    // 4) 本地已安装/内置插件已满足依赖（如依赖内置的 access:aliyun），无需提示安装
    const localPlugin = findLocalPluginSatisfyingDependency(dependencyType, dependencyName);
    if (localPlugin) {
      return localPlugin;
    }
    return undefined;
  }

  function findLocalPluginSatisfyingDependency(dependencyType: string, dependencyName: string) {
    const pluginDefine = pluginStore.getPluginDefineSync(dependencyName);
    if (!pluginDefine) {
      return undefined;
    }
    return {
      name: dependencyName,
      fullName: `local:${dependencyType || "plugin"}:${dependencyName}`,
      installed: true,
    };
  }

  function dependencySatisfied(record: any, requirement?: string) {
    if (!record.installed) {
      return false;
    }
    const requirementText = (requirement || "").trim();
    if (!requirementText || requirementText === "*") {
      return true;
    }
    // 具体版本号要求：已安装版本不低于要求即视为已满足，否则需要重新安装升级
    return compareVersions(record.version, requirementText) >= 0;
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
