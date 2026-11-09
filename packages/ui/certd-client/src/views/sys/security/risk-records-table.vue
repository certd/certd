<template>
  <div class="security-risk-table">
    <FnCrud ref="tableRef" v-bind="tableOptions">
      <template #header>
        <div class="risk-table-header">
          <p>扫描拦截、注入特征与可疑流水线统一审计</p>
        </div>
      </template>
    </FnCrud>
  </div>
</template>

<script lang="tsx" setup>
import { ref } from "vue";
import { RouterLink } from "vue-router";
import { notification } from "ant-design-vue";
import { model, compute, DictStore, FnCrud, type FnCrudOptions, type FnTablePageQuery, type FnTablePageResult } from "/@/components/table";
import permissionUtil from "/@/plugin/permission/util.permission";
import { useI18n } from "/src/locales";
import { RiskRecord, RiskReviewStatus, securityMonitorApi } from "./api";

const emit = defineEmits<{ changed: [] }>();
const { t } = useI18n();
const tableRef = ref<{ refresh: () => Promise<void>; getSelectedRowKeys: () => Array<string | number>; clearSelectedRowKeys: () => void }>();
const batchLoading = ref(false);
const reviewStatusOptions: { value: RiskReviewStatus; key: string }[] = [
  { value: "unverified", key: "reviewUnverified" },
  { value: "open", key: "reviewOpen" },
  { value: "contained", key: "reviewContained" },
  { value: "resolved", key: "reviewResolved" },
  { value: "falsePositive", key: "reviewFalsePositive" },
  { value: "notRequired", key: "reviewNotRequired" },
];
const riskTypeDict = new DictStore({
  data: [
    { label: "全部记录", value: "" },
    { label: "扫描拦截", value: "scan" },
    { label: "注入特征", value: "injection" },
    { label: "可疑流水线", value: "suspicious-pipeline" },
    { label: "已封禁", value: "scan-ban" },
  ],
});
const riskLevelDict = new DictStore({
  data: [
    { label: "低风险", value: "low" },
    { label: "中风险", value: "medium" },
    { label: "高风险", value: "high" },
  ],
});
const tableOptions: FnCrudOptions<RiskRecord> = {
  rowSelect: permissionUtil.hasPermissions("sys:settings:edit") ? { title: "选择风险记录", crossPage: true } : undefined,
  actionbar: {
    buttons: {
      batchReview: {
        text: t("certd.sys.securityMonitor.batchSetReviewStatus"),
        type: "primary",
        show: permissionUtil.hasPermissions("sys:settings:edit"),
        disabled: batchLoading.value,
        click: openBatchReviewDialog,
      },
    },
  },
  layout: [
    {
      style: {},
      cols: [
        { type: "header", style: {} },
        { type: "", style: {} },
      ],
    },
    {
      style: {},
      cols: [
        { type: "actionbar", style: {} },
        { type: "tabs", style: { flex: 1 } },
        { type: "search", style: {} },
      ],
    },
  ],
  search: {
    columns: {
      level: { order: 1, component: { name: "a-select", vModel: "value", placeholder: "风险等级", allowClear: true }, width: 125, dict: riskLevelDict },
      keyword: { order: 2, component: { name: "a-input", vModel: "value", placeholder: "搜索 IP、路径或流水线", allowClear: true }, width: 220 },
    },
  },
  columns: {
    createTime: { key: "createTime", title: "时间", cell: { order: 1, width: 190, render: ({ row }) => <span class="time">{formatDate(row.createTime)}</span> } },
    type: {
      key: "type",
      title: "风险类型",
      cell: {
        order: 2,
        width: 150,
        dict: riskTypeDict,
        render: ({ row }) => (
          <span class="type">
            <i class={`dot ${dotClass(row.type)}`}></i>
            {typeLabel(row.type)}
          </span>
        ),
      },
    },
    level: { key: "level", title: "风险等级", cell: { order: 3, width: 110, render: ({ row }) => <span class={`pill ${row.level}`}>{levelLabel(row.level)}</span> } },
    userId: { key: "userId", title: "用户 ID", cell: { order: 4, width: 100 } },
    ip: { key: "ip", title: "来源 IP", cell: { order: 5, width: 150 } },
    path: { key: "path", title: "请求路径", cell: { order: 6, width: 260, ellipsis: true } },
    pipelineName: {
      key: "pipelineName",
      title: "关联流水线",
      cell: {
        order: 7,
        width: 190,
        render: ({ row }) => {
          let pipelineName = row.pipelineName;
          if (!pipelineName && row.pipelineId) {
            pipelineName = `#${row.pipelineId}`;
          }
          if (row.pipelineId) {
            return (
              <RouterLink class="pipeline" to={{ path: "/cert/pipeline/detail", query: { id: row.pipelineId, editMode: "false" } }}>
                {pipelineName}
              </RouterLink>
            );
          }
          return <span class="pipeline">{pipelineName || "—"}</span>;
        },
      },
    },
    status: {
      key: "status",
      title: t("certd.sys.securityMonitor.recordStatus"),
      cell: {
        order: 8,
        width: 120,
        render: ({ row }) => {
          let statusClass = "done";
          let statusText = t("certd.sys.securityMonitor.recordStatusDetected");
          if (row.status === "banned") {
            statusClass = "high";
            statusText = t("certd.sys.securityMonitor.recordStatusBanned");
          } else if (row.status === "alerted") {
            statusText = t("certd.sys.securityMonitor.recordStatusAlerted");
          }
          return <span class={`pill ${statusClass}`}>{statusText}</span>;
        },
      },
    },
    reviewStatus: {
      key: "reviewStatus",
      title: t("certd.sys.securityMonitor.reviewStatus"),
      cell: {
        order: 9,
        width: 120,
        render: ({ row }) => {
          const status = row.reviewStatus || "resolved";
          return <span class={`pill review-${status}`}>{reviewStatusLabel(status)}</span>;
        },
      },
    },
    detail: { key: "detail", title: "风险详情", cell: { order: 10, width: 280, ellipsis: true } },
  },
  rowHandle: {
    width: 130,
    fixed: "right",
    buttons: {
      edit: { show: false },
      delete: { show: false },
      actions: {
        text: "更多操作",
        type: "link",
        buttonType: "dropdown",
        show: compute(() => permissionUtil.hasPermissions("sys:settings:edit")),
        items: [
          ...reviewStatusOptions.map(option => ({
            key: `review-${option.value}`,
            label: `标记为${t(`certd.sys.securityMonitor.${option.key}`)}`,
            show: compute(({ row }) => row.reviewStatus !== option.value),
            onClick: ({ row }) => updateRiskReviewStatus(row as RiskRecord, option.value),
          })),
          {
            key: "banIp",
            label: "封禁 IP",
            danger: true,
            show: compute(({ row }) => Boolean(row.ip) && row.ip !== "unknown" && !(row.type === "scan-ban" && row.status === "banned")),
            onClick: ({ row }) => confirmBan("ip", row.ip),
          },
          {
            key: "unblockIp",
            label: "解除 IP 封禁",
            show: compute(({ row }) => Boolean(row.ip) && row.ip !== "unknown" && row.type === "scan-ban" && row.status === "banned"),
            onClick: ({ row }) => confirmUnblock(row.ip),
          },
          {
            key: "allowIp",
            label: "IP 加白名单",
            show: compute(({ row }) => Boolean(row.ip) && row.ip !== "unknown"),
            onClick: ({ row }) => confirmAllow("ip", row.ip),
          },
          {
            key: "banUser",
            label: "封禁用户",
            danger: true,
            show: compute(({ row }) => Number.isSafeInteger(row.userId) && row.userId > 0),
            onClick: ({ row }) => confirmBan("user", String(row.userId)),
          },
          {
            key: "allowUser",
            label: "用户加白名单",
            show: compute(({ row }) => Number.isSafeInteger(row.userId) && row.userId > 0),
            onClick: ({ row }) => confirmAllow("user", String(row.userId)),
          },
        ],
      },
    },
  },
  request: { pageRequest },
  tabs: { refCol: "type" },
  id: "security-monitor-table",
  table: {
    minWidth: 1650,
    rowKey: "id",
    emptyText: "暂无风险记录",
  },
  pagination: { current: 1, pageSize: 20, pageSizeProps: ["10", "20", "30", "40", "50", "100"], showTotal: total => `共 ${total} 条` },
};

async function pageRequest(query: FnTablePageQuery): Promise<FnTablePageResult<RiskRecord>> {
  return await securityMonitorApi.riskRecordsPage({
    page: { offset: query.page.offset, limit: query.page.limit },
    query: query.query,
    sort: query.sort || { prop: "id", asc: false },
    tabsName: "type",
  });
}
function typeLabel(type: string) {
  return { scan: "URL 扫描", injection: "注入特征", "suspicious-pipeline": "可疑流水线", "scan-ban": "IP 封禁" }[type] || type;
}
function dotClass(type: string) {
  if (type === "scan") return "green";
  if (type === "injection") return "orange";
  return "";
}
function levelLabel(level: string) {
  return { low: "低风险", medium: "中风险", high: "高风险" }[level] || level;
}
function reviewStatusLabel(status: RiskReviewStatus) {
  const option = reviewStatusOptions.find(item => item.value === status);
  return option ? t(`certd.sys.securityMonitor.${option.key}`) : status;
}
function formatDate(value: string | number) {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}
async function openBatchReviewDialog() {
  const ids = (tableRef.value?.getSelectedRowKeys() || []).map(String);
  if (ids.length === 0 || batchLoading.value) {
    notification.info({ message: t("certd.sys.securityMonitor.batchReviewStatusPlaceholder") });
    return;
  }
  await tableRef.value?.openFormDialog({
    title: t("certd.sys.securityMonitor.batchSetReviewStatus"),
    width: 480,
    initialForm: { reviewStatus: undefined },
    columns: {
      reviewStatus: {
        title: t("certd.sys.securityMonitor.reviewStatus"),
        span: 24,
        rules: [{ required: true, message: t("certd.sys.securityMonitor.batchReviewStatusPlaceholder") }],
        component: {
          name: "a-select",
          vModel: "value",
          placeholder: t("certd.sys.securityMonitor.batchReviewStatusPlaceholder"),
          options: reviewStatusOptions.map(option => ({ value: option.value, label: t(`certd.sys.securityMonitor.${option.key}`) })),
        },
      },
    },
    onSubmit: async ({ form }) => {
      await batchUpdateRiskReviewStatus(ids, form?.reviewStatus);
    },
  });
}
async function batchUpdateRiskReviewStatus(ids: string[], reviewStatus?: RiskReviewStatus) {
  if (!reviewStatus || ids.length === 0 || batchLoading.value) {
    return;
  }
  batchLoading.value = true;
  try {
    await securityMonitorApi.updateRiskReviewStatuses(ids, reviewStatus);
    notification.success({ message: t("certd.sys.securityMonitor.batchUpdateReviewStatusSuccess", { count: ids.length }) });
    clearRiskSelection();
    emit("changed");
  } catch (error: any) {
    notification.error({ message: t("certd.sys.securityMonitor.batchUpdateReviewStatusError"), description: error.message });
  } finally {
    batchLoading.value = false;
  }
}
function clearRiskSelection() {
  tableRef.value?.clearSelectedRowKeys();
}
async function updateRiskReviewStatus(row: RiskRecord, reviewStatus: RiskReviewStatus) {
  try {
    await securityMonitorApi.updateRiskReviewStatus(row.id, reviewStatus);
    notification.success({ message: t("certd.sys.securityMonitor.updateReviewStatusSuccess") });
    emit("changed");
  } catch (error: any) {
    notification.error({ message: t("certd.sys.securityMonitor.updateReviewStatusError"), description: error.message });
  }
}
function confirmBan(targetType: "ip" | "user", targetValue: string) {
  let targetLabel = `IP ${targetValue}`;
  let description = "封禁后将禁止该 IP 访问本站。";
  if (targetType === "user") {
    targetLabel = `用户 ID ${targetValue}`;
    description = "封禁后将禁止该用户访问本站及运行流水线。";
  }
  return model.confirm({
    title: "确认封禁",
    body: () => `确定封禁 ${targetLabel} 吗？${description}本次为永久封禁，可在封禁管理中解除。`,
    buttons: {
      confirm: {
        text: "确认封禁",
        danger: true,
        onClick: async () => {
          await securityMonitorApi.addBan({ targetType, targetValue, action: "ban", scope: "access", reason: "从风险记录手动封禁" });
          notification.success({ message: `${targetLabel} 已封禁` });
          emit("changed");
        },
      },
    },
  });
}
function confirmAllow(targetType: "ip" | "user", targetValue: string) {
  let targetLabel = `IP ${targetValue}`;
  let successMessage = "IP 已加入白名单";
  if (targetType === "user") {
    targetLabel = `用户 ID ${targetValue}`;
    successMessage = "用户已加入白名单";
  }
  return model.confirm({
    title: "加入白名单",
    body: () => `确定将 ${targetLabel} 加入白名单吗？`,
    buttons: {
      confirm: {
        text: "加入白名单",
        onClick: async () => {
          await securityMonitorApi.addBan({ targetType, targetValue, action: "allow", scope: "access", reason: "从风险记录加入白名单" });
          notification.success({ message: successMessage });
          emit("changed");
        },
      },
    },
  });
}
function confirmUnblock(ip: string) {
  return model.confirm({
    title: "解除 IP 封禁",
    body: () => `确定解除 ${ip} 的封禁吗？`,
    buttons: {
      confirm: {
        text: "解除封禁",
        onClick: async () => {
          await securityMonitorApi.unblock(ip);
          notification.success({ message: "IP 已解除封禁" });
          emit("changed");
          await refresh();
        },
      },
    },
  });
}
async function refresh() {
  await tableRef.value?.refresh();
}

defineExpose({ refresh });
</script>

<style lang="less">
.security-risk-table {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;

  > .fn-crud {
    min-height: 0;
    flex: 1;
  }

  .time,
  .ip {
    color: #46546b;
    font-family: ui-monospace, Consolas, monospace;
    font-size: 12px !important;
  }

  .type {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-weight: 600;
  }

  .risk-table-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;

    > p {
      margin: 0;
      color: #8490a3;
      font-size: 13px;
    }
  }

  .risk-batch-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    color: #596579;
    font-size: 12px;
  }

  .risk-batch-actions__select {
    width: 180px;
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #e54b4b;

    &.orange {
      background: #ec9a3d;
    }

    &.green {
      background: #16a36b;
    }
  }

  .pill {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;

    &.low,
    &.done {
      color: #16885d;
      background: #eaf8f1;
    }

    &.medium {
      color: #a56718;
      background: #fff7e8;
    }

    &.high {
      color: #c83737;
      background: #fff0f0;
    }

    &.review-unverified {
      color: #a56718;
      background: #fff7e8;
    }

    &.review-open {
      color: #c83737;
      background: #fff0f0;
    }

    &.review-contained,
    &.review-resolved {
      color: #16885d;
      background: #eaf8f1;
    }

    &.review-falsePositive {
      color: #596579;
      background: #eef1f5;
    }

    &.review-notRequired {
      color: #596579;
      background: #eef1f5;
    }
  }

  .pipeline {
    color: #375fc4;
    font-weight: 600;
  }

  .dark & {
    .time,
    .ip {
      color: rgba(255, 255, 255, 0.75);
    }

    .pill {
      &.low,
      &.done {
        color: #73d13d;
        background: #162312;
      }

      &.medium {
        color: #ffc53d;
        background: #2b2111;
      }

      &.high {
        color: #ff7875;
        background: #2a1215;
      }

      &.review-unverified {
        color: #ffc53d;
        background: #2b2111;
      }

      &.review-open {
        color: #ff7875;
        background: #2a1215;
      }

      &.review-contained,
      &.review-resolved {
        color: #73d13d;
        background: #162312;
      }

      &.review-falsePositive,
      &.review-notRequired {
        color: rgba(255, 255, 255, 0.65);
        background: #303030;
      }
    }
  }
}
</style>
