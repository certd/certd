<template>
  <div class="security-ban-manager">
    <FnTable ref="tableRef" :options="tableOptions">
      <template #header>
        <p>封禁管理</p>
      </template>
    </FnTable>
  </div>
</template>

<script lang="tsx" setup>
import { computed, reactive, ref } from "vue";
import { notification } from "ant-design-vue";
import { DictStore, FnTable, type FnTableOptions, type FnTablePageQuery, type FnTablePageResult } from "/@/components/table";
import { SecurityBan, securityMonitorApi } from "./api";

const emit = defineEmits<{ changed: [] }>();
const tableRef = ref<{ refresh: () => Promise<void> }>();
const state = reactive({ removingId: 0 });
const typeDict = new DictStore({
  data: [
    { label: "全部生效中", value: "" },
    { label: "IP 封禁", value: "ip" },
    { label: "禁止运行流水线", value: "pipeline" },
    { label: "禁止访问", value: "access" },
  ],
});
const columns = {
  targetValue: { key: "targetValue", title: "封禁目标", order: 1, cell: { width: 170, render: ({ row }: { row: SecurityBan }) => renderTarget(row) } },
  type: { key: "type", title: "类型", order: 2, cell: { width: 180, dict: typeDict, render: ({ row }: { row: SecurityBan }) => renderType(row) } },
  detail: { key: "detail", title: "原因 / 来源", order: 3, cell: { width: 260, render: ({ row }: { row: SecurityBan }) => renderDetail(row) } },
  createTime: { key: "createTime", title: "创建时间", order: 4, cell: { width: 165, render: ({ row }: { row: SecurityBan }) => renderDate(row.createTime) } },
  expiresAt: { key: "expiresAt", title: "到期时间", order: 5, cell: { width: 170, render: ({ row }: { row: SecurityBan }) => renderExpiry(row) } },
  operator: { key: "operator", title: "操作人", order: 6, cell: { width: 140, render: () => "—" } },
  action: { key: "action", title: "操作", order: 7, cell: { width: 150, render: ({ row }: { row: SecurityBan }) => renderAction(row) } },
};
const tableOptions = computed<FnTableOptions<SecurityBan>>(() => ({
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
  search: { columns: { keyword: { order: 1, component: { name: "a-input", vModel: "value" }, placeholder: "搜索 IP、用户名或原因", width: 250, allowClear: true } } },
  columns,
  request: { pageRequest },
  tabs: { refCol: "type" },
  rowKey: "id",
  table: { minWidth: 1120 },
  pagination: { current: 1, pageSize: 20, pageSizeOptions: ["10", "20", "30", "50"], showTotal: total => `共 ${total} 条` },
  emptyText: "暂无封禁记录",
}));

async function pageRequest(query: FnTablePageQuery): Promise<FnTablePageResult<SecurityBan>> {
  return await securityMonitorApi.banPage({
    action: "ban",
    page: query.page,
    query: query.query,
    sort: query.sort || { prop: "id", asc: false },
    tabsName: "type",
  });
}
function renderTarget(record: SecurityBan) {
  if (record.targetType === "ip") return <span class="security-ban-manager__code">{record.targetValue}</span>;
  return (
    <span class="security-ban-manager__target">
      <strong>{record.targetValue}</strong>
      <small>用户 ID {record.targetValue}</small>
    </span>
  );
}
function renderType(record: SecurityBan) {
  const label = record.targetType === "ip" ? "IP 封禁" : record.scope === "pipeline" ? "禁止运行流水线" : "禁止访问";
  return <span class={`security-ban-manager__pill ${record.targetType === "ip" ? "ip" : "ban"}`}>{label}</span>;
}
function renderDetail(record: SecurityBan) {
  return <span class="security-ban-manager__detail">{record.reason || "安全规则自动处置"}</span>;
}
function renderDate(value: string) {
  const date = new Date(value);
  return (
    <span class="security-ban-manager__date">
      {date.toLocaleDateString("zh-CN")}
      <small>{date.toLocaleTimeString("zh-CN", { hour12: false })}</small>
    </span>
  );
}
function renderExpiry(record: SecurityBan) {
  if (!record.expiresAt)
    return (
      <span class="security-ban-manager__detail">
        永久<small>管理员解除后恢复</small>
      </span>
    );
  return renderDate(record.expiresAt);
}
function renderAction(record: SecurityBan) {
  const label = record.targetType === "ip" ? "解除 IP 封禁" : record.scope === "pipeline" ? "解除运行限制" : "恢复访问";
  return (
    <a-button type="link" size="small" loading={state.removingId === record.id} onClick={() => remove(record)}>
      {label}
    </a-button>
  );
}
async function remove(record: SecurityBan) {
  state.removingId = record.id;
  try {
    await securityMonitorApi.removeBan(record.id);
    notification.success({ message: "封禁已解除" });
    await tableRef.value?.refresh();
    emit("changed");
  } finally {
    state.removingId = 0;
  }
}
</script>

<style lang="less">
.security-ban-manager {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  .fn-table {
    min-height: 0;
    flex: 1;
  }
  .security-ban-manager__code {
    font-family: ui-monospace, Consolas, monospace;
    font-size: 12px;
  }
  .security-ban-manager__target,
  .security-ban-manager__detail,
  .security-ban-manager__date {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .security-ban-manager__target strong {
    color: #304d5d;
  }
  .security-ban-manager__target small,
  .security-ban-manager__detail small,
  .security-ban-manager__date small {
    color: #98a5aa;
    font-size: 11px;
  }
  .security-ban-manager__pill {
    display: inline-flex;
    width: fit-content;
    padding: 4px 7px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 650;
  }
  .security-ban-manager__pill.ip {
    color: #38678c;
    background: #eaf2f8;
  }
  .security-ban-manager__pill.ban {
    color: #bb3d3d;
    background: #fcebea;
  }
}
.dark .security-ban-manager {
  .security-ban-manager__target strong {
    color: rgba(255, 255, 255, 0.85);
  }
  .security-ban-manager__pill.ip {
    color: #91caff;
    background: #111d2c;
  }
  .security-ban-manager__pill.ban {
    color: #ff7875;
    background: #2a1215;
  }
}
</style>
