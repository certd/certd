<template>
  <div class="security-risk-table">
    <FnCrud ref="tableRef" v-bind="tableOptions">
      <template #header>
        <p>扫描拦截、注入特征与可疑流水线统一审计</p>
      </template>
    </FnCrud>
  </div>
</template>

<script lang="tsx" setup>
import { ref } from "vue";
import { RouterLink } from "vue-router";
import { notification } from "ant-design-vue";
import { model, DictStore, FnButton, FnCrud, type FnButtonItem, type FnCrudOptions, type FnTablePageQuery, type FnTablePageResult } from "/@/components/table";
import permissionUtil from "/@/plugin/permission/util.permission";
import { RiskRecord, securityMonitorApi } from "./api";

const emit = defineEmits<{ changed: [] }>();
const tableRef = ref<{ refresh: () => Promise<void> }>();
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
      title: "处理状态",
      cell: {
        order: 8,
        width: 120,
        render: ({ row }) => {
          let statusClass = "done";
          let statusText = "已记录";
          if (row.status === "banned") {
            statusClass = "high";
            statusText = "已封禁";
          } else if (row.status === "alerted") {
            statusText = "已告警";
          }
          return <span class={`pill ${statusClass}`}>{statusText}</span>;
        },
      },
    },
    detail: { key: "detail", title: "风险详情", cell: { order: 9, width: 280, ellipsis: true } },
  },
  rowHandle: {
    width: 130,
    fixed: "right",
    render: ({ row }) => {
      if (!permissionUtil.hasPermissions("sys:settings:edit")) {
        return "—";
      }
      const items: FnButtonItem[] = [];
      if (row.ip && row.ip !== "unknown") {
        if (row.type === "scan-ban" && row.status === "banned") {
          items.push({ key: "unblock", label: "解除 IP 封禁", onClick: () => confirmUnblock(row.ip) });
        } else {
          items.push({ key: "banIp", label: "封禁 IP", danger: true, onClick: () => confirmBan("ip", row.ip) });
        }
        items.push({ key: "allowIp", label: "IP 加白名单", onClick: () => confirmAllow("ip", row.ip) });
      }
      if (Number.isSafeInteger(row.userId) && row.userId > 0) {
        const userId = String(row.userId);
        items.push({ key: "banUser", label: "封禁用户", danger: true, onClick: () => confirmBan("user", userId) });
        items.push({ key: "allowUser", label: "用户加白名单", onClick: () => confirmAllow("user", userId) });
      }
      if (items.length === 0) {
        return "—";
      }
      return <FnButton text="更多操作" type="link" buttonType="dropdown" items={items} />;
    },
  },
  request: { pageRequest },
  tabs: { refCol: "type" },
  id: "security-monitor-table",
  table: { minWidth: 1550, rowKey: "id", emptyText: "暂无风险记录" },
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
function formatDate(value: string | number) {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
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
    }
  }
}
</style>
