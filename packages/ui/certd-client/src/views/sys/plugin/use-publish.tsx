import { reactive, ref } from "vue";
import { notification } from "ant-design-vue";
import { useFormDialog } from "/@/use/use-dialog";
import { useI18n } from "/src/locales";
import { usePluginStore } from "/@/store/plugin";
import * as api from "./api";
import "./use-publish.less";

type PublishManagerResult =
  | {
      action: "publish";
      version: string;
    }
  | {
      action: "registered";
    }
  | {
      action: "cancel";
    };

export function usePluginPublish() {
  const { t } = useI18n();
  const { openFormDialog } = useFormDialog();
  const pluginStore = usePluginStore();
  const publishingPluginId = ref<number | string>("");

  const authorNamePattern = /^[A-Za-z][A-Za-z0-9_-]*$/;

  function getPluginTypeLabel(pluginType: string) {
    const labelMap: Record<string, string> = {
      access: t("certd.auth"),
      dnsProvider: t("certd.dns"),
      deploy: t("certd.deployPlugin"),
    };
    return labelMap[pluginType] || pluginType || "-";
  }

  function isPublishingPlugin(row: any) {
    return !!row?.id && publishingPluginId.value === row.id;
  }

  function registerPluginAuthor() {
    return new Promise<api.OnlinePluginAuthorBean | undefined>(async resolve => {
      let resolved = false;
      const resolveAuthor = (author?: api.OnlinePluginAuthorBean) => {
        if (resolved) {
          return;
        }
        resolved = true;
        resolve(author);
      };

      const formRes = await openFormDialog({
        title: t("certd.onlinePluginAuthorRegister"),
        wrapper: {
          width: 560,
          onClosed() {
            resolveAuthor();
          },
        },
        initialForm: {
          name: "",
          nameConfirm: "",
          desc: "",
        },
        async onSubmit(form: any) {
          if (form.name?.trim() !== form.nameConfirm?.trim()) {
            notification.error({
              message: "两次输入的作者名称不一致",
            });
            return false;
          }
          const author = await api.OnlinePluginAuthorAdd({
            name: form.name,
            displayName: form.displayName,
            desc: form.desc,
          });
          resolveAuthor(author);
        },
        columns: {
          name: {
            title: t("certd.onlinePluginAuthorName"),
            type: "text",
            form: {
              col: { span: 24 },
              helper: t("certd.onlinePluginAuthorNameHelper"),
              rules: [
                { required: true, message: t("certd.onlinePluginAuthorNameRequired") },
                {
                  pattern: authorNamePattern,
                  message: t("certd.onlinePluginAuthorNameRuleMsg"),
                },
              ],
            },
          },
          nameConfirm: {
            title: "确认作者名称",
            type: "text",
            form: {
              col: { span: 24 },
              helper: "请再次输入相同名称。作者名称注册后不允许修改。",
              rules: [
                { required: true, message: "请再次输入作者名称" },
                {
                  validator: async (rule: any, value: string) => {
                    if (value !== formRes?.getFormData().name) {
                      throw new Error("两次输入的作者名称不一致");
                    }
                  },
                },
              ],
            },
          },
        },
      });
    });
  }

  function getStatusLabel(status?: string) {
    const labelMap: Record<string, string> = {
      draft: t("certd.onlinePluginStatusDraft"),
      reviewing: t("certd.onlinePluginStatusReviewing"),
      published: t("certd.onlinePluginStatusPublished"),
      rejected: t("certd.onlinePluginStatusRejected"),
      offline: t("certd.onlinePluginStatusOffline"),
    };
    return labelMap[status || ""] || status || "-";
  }

  function normalizeVersion(version?: string) {
    return (version || "").trim();
  }

  function isReviewingVersion(version: api.OnlinePluginVersionBean) {
    return version.status === "reviewing" || version.reviewStatus === "ai_pending" || version.reviewStatus === "pending";
  }

  function compareVersion(current: string, last: string) {
    const currentParts = normalizeVersion(current)
      .replace(/^v/i, "")
      .split(".")
      .map(item => Number.parseInt(item, 10));
    const lastParts = normalizeVersion(last)
      .replace(/^v/i, "")
      .split(".")
      .map(item => Number.parseInt(item, 10));
    const maxLength = Math.max(currentParts.length, lastParts.length);
    for (let index = 0; index < maxLength; index++) {
      const currentPart = currentParts[index] || 0;
      const lastPart = lastParts[index] || 0;
      if (currentPart > lastPart) {
        return 1;
      }
      if (currentPart < lastPart) {
        return -1;
      }
    }
    return 0;
  }

  function findLatestPublishedVersion(versions: api.OnlinePluginVersionBean[], latest?: string) {
    const publishedVersions = versions.filter(item => item.status === "published");
    const latestText = normalizeVersion(latest);
    if (latestText) {
      const matched = publishedVersions.find(item => normalizeVersion(item.version) === latestText);
      if (matched) {
        return matched;
      }
    }
    return publishedVersions[0];
  }

  function getDefaultPublishVersion(row: any, localPlugin: any, reviewingVersion?: api.OnlinePluginVersionBean) {
    const localVersion = normalizeVersion(row.version || localPlugin.version);
    if (reviewingVersion) {
      return localVersion || normalizeVersion(reviewingVersion.version);
    }
    return localVersion || "1.0.0";
  }

  function getVersionError(version: string, baselineVersion?: api.OnlinePluginVersionBean) {
    const value = normalizeVersion(version);
    if (!value) {
      return t("certd.onlinePluginPublishVersionRequired");
    }
    if (!/^v?\d+(\.\d+)*$/i.test(value)) {
      return t("certd.onlinePluginVersionFormatError");
    }
    if (baselineVersion?.version && compareVersion(value, baselineVersion.version) <= 0) {
      return t("certd.onlinePluginVersionBaselineError", { version: baselineVersion.version });
    }
    return "";
  }

  function getStatusColor(status?: string) {
    const colorMap: Record<string, string> = {
      draft: "default",
      reviewing: "processing",
      published: "success",
      rejected: "error",
      offline: "warning",
    };
    return colorMap[status || ""] || "default";
  }

  function getAiCheckIcon(version: api.OnlinePluginVersionBean) {
    if (version.aiCheckStatus === "rejected") {
      return "lucide:shield-x";
    }
    if (version.aiCheckStatus === "pending") {
      return "lucide:shield-alert";
    }
    return "lucide:shield-check";
  }

  function getAiCheckTooltip(version: api.OnlinePluginVersionBean) {
    const result = `${version.aiCheckResult || ""}`.trim();
    if (version.aiCheckStatus === "rejected") {
      return result ? `AI 安全审查未通过：${result}` : "AI 安全审查未通过";
    }
    if (version.aiCheckStatus === "pending" || version.reviewStatus === "ai_pending") {
      return result ? `AI 安全审查中：${result}` : "AI 安全审查中";
    }
    return result ? `AI 安全审查已通过：${result}` : "AI 安全审查已通过";
  }

  function isAdminRejected(version: api.OnlinePluginVersionBean) {
    return version.reviewStatus === "rejected" && !!`${version.reviewReason || ""}`.trim();
  }

  function hasAdminReview(version: api.OnlinePluginVersionBean) {
    return version.reviewStatus === "passed" || isAdminRejected(version);
  }

  function getAdminReviewTooltip(version: api.OnlinePluginVersionBean) {
    if (isAdminRejected(version)) {
      return `管理员审核已拒绝：${version.reviewReason}`;
    }
    return "管理员审核已通过";
  }

  function renderReviewIndicators(version: api.OnlinePluginVersionBean) {
    const aiCheckStatus = version.aiCheckStatus || (version.reviewStatus === "ai_pending" ? "pending" : "");
    return (
      <span class="sys-plugin-publish__review-icons">
        {aiCheckStatus ? (
          <a-tooltip title={getAiCheckTooltip(version)}>
            <fs-icon class={["sys-plugin-publish__review-icon", "is-ai", `is-${aiCheckStatus}`]} icon={getAiCheckIcon({ ...version, aiCheckStatus })} />
          </a-tooltip>
        ) : null}
        {hasAdminReview(version) ? (
          <a-tooltip title={getAdminReviewTooltip(version)}>
            <fs-icon class={["sys-plugin-publish__review-icon", "is-admin", { "is-rejected": isAdminRejected(version) }]} icon={isAdminRejected(version) ? "lucide:user-x" : "lucide:user-check"} />
          </a-tooltip>
        ) : null}
      </span>
    );
  }

  function renderRejectedReasons(version: api.OnlinePluginVersionBean) {
    const aiReason = version.aiCheckStatus === "rejected" ? `${version.aiCheckResult || ""}`.trim() : "";
    if (!aiReason) {
      return null;
    }
    return (
      <div class="sys-plugin-publish__rejected-reasons">
        <div class="sys-plugin-publish__rejected-reason is-ai">AI 审查未通过：{aiReason}</div>
      </div>
    );
  }

  function openPublishManager(row: any, info: Awaited<ReturnType<typeof api.OnlinePluginPublishInfo>>) {
    const author = info.author;
    const marketPlugin = info.marketPlugin;
    const versions = info.versions || [];
    const localPlugin = info.localPlugin || row;
    const reviewingVersion = versions.find(isReviewingVersion);
    const rejectedVersion = versions.find(item => item.status === "rejected" || item.reviewStatus === "rejected");
    const replaceableVersion = reviewingVersion || rejectedVersion;
    const latestPublished = findLatestPublishedVersion(versions, marketPlugin?.latest);
    const latestVersion = versions[0];
    const isFirstPublish = !marketPlugin && versions.length === 0;
    const publishMode = isFirstPublish ? "first" : replaceableVersion ? "cover" : "new";
    const defaultVersion = getDefaultPublishVersion(row, localPlugin, replaceableVersion);
    const versionBaseline = publishMode === "cover" ? latestPublished : latestVersion;
    const state = reactive({
      version: defaultVersion,
      error: getVersionError(defaultVersion, versionBaseline),
    });

    let formWrapper: any;
    let resolved = false;
    let resolveResult: (result: PublishManagerResult) => void;

    function getPublishModeTitle() {
      if (publishMode === "first") {
        return "首次发布";
      }
      if (publishMode === "cover") {
        return "覆盖待审核版本";
      }
      return "发布新版本";
    }

    function getPublishModeTip() {
      if (publishMode === "first") {
        return "插件还没有提交到在线市场，确认后会创建插件并提交发布审核。";
      }
      if (publishMode === "cover") {
        if (rejectedVersion && rejectedVersion === replaceableVersion) {
          return `当前 v${rejectedVersion.version || "-"} 已被拒绝，本次提交可覆盖该版本并重新提交审核。`;
        }
        return `当前已有 v${reviewingVersion?.version || "-"} 正在审核中，本次提交会撤回并覆盖该审核版本。`;
      }
      return `当前最新版本为 v${latestVersion?.version || latestPublished?.version || marketPlugin?.latest || "-"}，新提交的版本号必须更高。`;
    }

    function renderMetaItem(label: string, value: any) {
      return (
        <div class="cd-meta-item">
          <span class="cd-meta-label">{label}</span>
          <span class="cd-meta-value">{value || "-"}</span>
        </div>
      );
    }

    function renderAuthor() {
      if (info.authorRegistered) {
        return author?.displayName || author?.name || "-";
      }
      return (
        <span class="sys-plugin-publish__author-register">
          <span class="cd-text-danger">{t("certd.onlinePluginAuthorNotRegistered")}</span>
          <a-button
            size="small"
            type="link"
            onClick={async (event: any) => {
              event.stopPropagation();
              const createdAuthor = await registerPluginAuthor();
              if (!createdAuthor?.id) {
                return;
              }
              resolveResult({ action: "registered" });
              formWrapper?.close?.();
            }}
          >
            {t("certd.onlinePluginAuthorRegister")}
          </a-button>
        </span>
      );
    }

    function renderLatestVersion() {
      if (!latestVersion) {
        return <div class="cd-text-muted">{t("certd.onlinePluginNoSubmittedVersion")}</div>;
      }
      return (
        <div class="sys-plugin-publish__latest-version">
          <div class="sys-plugin-publish__version-line">
            <strong class="sys-plugin-publish__version">v{latestVersion.version || "-"}</strong>
            <a-tag color={getStatusColor(latestVersion.status)}>{getStatusLabel(latestVersion.status)}</a-tag>
            {renderReviewIndicators(latestVersion)}
          </div>
          {renderRejectedReasons(latestVersion)}
        </div>
      );
    }

    function renderContent() {
      return (
        <div class="sys-plugin-publish">
          <div class="sys-plugin-publish__hero">
            <div class="sys-plugin-publish__icon-wrap">
              <fs-icon class="sys-plugin-publish__icon" icon={localPlugin.icon || row.icon || "clarity:plugin-line"} />
            </div>
            <div class="sys-plugin-publish__hero-main">
              <div class="sys-plugin-publish__title-line">
                <div class="sys-plugin-publish__title">{localPlugin.title || row.title || localPlugin.name || row.name || "-"}</div>
                <a-tag color="blue">{getPublishModeTitle()}</a-tag>
              </div>
              <div class="sys-plugin-publish__desc">{localPlugin.desc || row.desc || "暂无描述"}</div>
            </div>
          </div>

          <div class="sys-plugin-publish__sections">
            <div class="cd-card-section">
              <div class="cd-card-section-title">插件信息</div>
              <div class="cd-meta-grid">
                {renderMetaItem(t("certd.pluginName"), localPlugin.name || row.name)}
                {renderMetaItem(t("certd.pluginType"), getPluginTypeLabel(localPlugin.pluginType || row.pluginType))}
                {renderMetaItem(t("certd.pluginGroup"), localPlugin.group || row.group)}
                {renderMetaItem(t("certd.onlinePluginPublishStatus"), marketPlugin ? getStatusLabel(marketPlugin.status) : t("certd.onlinePluginNotSubmitted"))}
                <div class="sys-plugin-publish__meta-full">{renderMetaItem(t("certd.author"), renderAuthor())}</div>
              </div>
            </div>

            <div class="cd-card-section">
              <div class="cd-card-section-title">{t("certd.onlinePluginLatestVersion")}</div>
              {renderLatestVersion()}
            </div>

            <div class="cd-card-section">
              <div class="cd-card-section-title cd-card-section-title--compact">{t("certd.onlinePluginCurrentRelease")}</div>
              <div class={["cd-tip-box sys-plugin-publish__prompt", { "cd-tip-box-warning": publishMode === "cover" }]}>
                <div class="cd-tip-title">{t("certd.onlinePluginPublishPrompt")}</div>
                <div>{getPublishModeTip()}</div>
              </div>
              <div class="cd-form-row">
                <label class="cd-form-label">{t("certd.version")}</label>
                <div>
                  <input
                    type="text"
                    value={state.version}
                    placeholder="请输入版本号，例如 1.0.1"
                    class={["cd-text-input", { "cd-text-input-error": state.error }]}
                    onInput={(event: any) => {
                      state.version = event?.target?.value || "";
                      state.error = getVersionError(state.version, versionBaseline);
                    }}
                  />
                  {state.error ? <div class="cd-field-error">{state.error}</div> : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return new Promise<PublishManagerResult>(resolve => {
      resolveResult = (result: PublishManagerResult) => {
        if (resolved) {
          return;
        }
        resolved = true;
        resolve(result);
      };
      void openFormDialog({
        title: marketPlugin ? t("certd.onlinePluginPublishManage") : t("certd.onlinePluginPublish"),
        columns: {},
        body: () => renderContent(),
        wrapper: {
          width: 920,
          buttons: {
            reset: {
              show: false,
            },
            ok: {
              show: true,
              text: t("certd.onlinePluginPublishSubmit"),
              disabled: !info.authorRegistered,
            },
            cancel: {
              show: true,
              text: "取消",
            },
          },
          onClosed() {
            resolveResult({ action: "cancel" });
          },
        },
        async onSubmit() {
          if (!info.authorRegistered) {
            throw new Error(t("certd.onlinePluginAuthorNotRegistered"));
          }
          state.error = getVersionError(state.version, versionBaseline);
          if (state.error) {
            throw new Error(state.error);
          }
          resolveResult({ action: "publish", version: normalizeVersion(state.version) });
        },
      }).then(wrapper => {
        formWrapper = wrapper;
      });
    });
  }

  async function publishLocalPlugin(row: any, options?: { beforePublish?: () => Promise<any>; afterPublish?: () => Promise<void> }) {
    if (!row?.id || (row.type !== "store" && row.type !== "custom")) {
      return;
    }
    const info = await api.OnlinePluginPublishInfo({
      id: row.id,
    });
    const action = await openPublishManager(row, info);
    if (action.action === "cancel") {
      return;
    }
    if (action.action === "registered") {
      await publishLocalPlugin(row, options);
      return;
    }
    if (action.action !== "publish") {
      return;
    }

    publishingPluginId.value = row.id;
    try {
      const publishRow = (await options?.beforePublish?.()) || row;
      await api.OnlinePluginPublish({
        id: publishRow.id,
        version: action.version,
      });
      if (normalizeVersion(publishRow.version) !== action.version) {
        await api.UpdateObj({
          ...publishRow,
          version: action.version,
        });
      }
      await pluginStore.reload();
      await options?.afterPublish?.();
      notification.success({ message: t("certd.onlinePluginPublishSuccess") });
    } finally {
      publishingPluginId.value = "";
    }
  }

  return {
    isPublishingPlugin,
    publishLocalPlugin,
    registerPluginAuthor,
  };
}
