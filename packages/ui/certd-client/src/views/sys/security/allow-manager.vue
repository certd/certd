<template>
  <div class="security-allow-manager">
    <FnTable ref="tableRef" :options="tableOptions">
      <template #header>
        <p class="mb-2">白名单只影响安全监控规则：IP 白名单跳过 IP 扫描封禁；用户白名单跳过关联账号的风险检测与自动处置。白名单不会绕过账号权限、用户访问封禁或流水线运行限制。</p>
      </template>
      <template #tools>
        <a-button @click="openAddDialog('ip')">＋ 添加 IP</a-button>
        <a-button type="primary" @click="openAddDialog('user')">＋ 添加用户</a-button>
      </template>
    </FnTable>
  </div>
</template>

<script lang="tsx" setup>
import { computed, reactive, ref } from "vue";
import { notification } from "ant-design-vue";
import { useFormDialog } from "/@/use/use-dialog";
import { DictStore, FnTable, type FnTableOptions, type FnTablePageQuery, type FnTablePageResult } from "/@/components/table";
import { SecurityBan, securityMonitorApi } from "./api";

const emit = defineEmits<{ changed: [] }>();
const { openFormDialog } = useFormDialog();
const tableRef = ref<{ refresh: () => Promise<void> }>();
const state = reactive({ removingId: 0 });
const typeDict = new DictStore({
  data: [
    { label: "全部", value: "" },
    { label: "IP 白名单", value: "ip" },
    { label: "用户白名单", value: "user" },
  ],
});
const columns = {
  targetValue: { key: "targetValue", title: "白名单目标", order: 1, cell: { width: 180, render: ({ row }: { row: SecurityBan }) => renderTarget(row) } },
  type: { key: "type", title: "类型", order: 2, cell: { width: 150, dict: typeDict, render: ({ row }: { row: SecurityBan }) => renderType(row) } },
  reason: { key: "reason", title: "备注", order: 3, cell: { width: 280, render: ({ row }: { row: SecurityBan }) => renderReason(row) } },
  createTime: { key: "createTime", title: "添加时间", order: 4, cell: { width: 180, render: ({ row }: { row: SecurityBan }) => renderDate(row.createTime) } },
  operator: { key: "operator", title: "添加人", order: 5, cell: { width: 150, render: () => "—" } },
  action: { key: "action", title: "操作", order: 6, cell: { width: 100, render: ({ row }: { row: SecurityBan }) => renderAction(row) } },
};
const tableOptions = computed<FnTableOptions<SecurityBan>>(() => ({
  layout: [
    { style: {}, cols: [{ type: "header", style: {} }] },
    {
      style: {},
      cols: [
        { type: "tabs", style: { flex: 1 } },
        { type: "search", style: {} },
      ],
    },
  ],
  search: { columns: { keyword: { order: 1, component: { name: "a-input", vModel: "value" }, placeholder: "搜索 IP、用户名或备注", width: 250, allowClear: true } } },
  columns,
  request: { pageRequest },
  tabs: { refCol: "type" },
  rowKey: "id",
  table: { minWidth: 980 },
  pagination: { current: 1, pageSize: 20, pageSizeOptions: ["10", "20", "30", "50"], showTotal: total => `共 ${total} 条` },
  emptyText: "暂无白名单记录",
}));

async function pageRequest(query: FnTablePageQuery): Promise<FnTablePageResult<SecurityBan>> {
  return await securityMonitorApi.banPage({
    action: "allow",
    page: query.page,
    query: query.query,
    sort: query.sort || { prop: "id", asc: false },
    tabsName: "type",
  });
}
async function openAddDialog(targetType: "ip" | "user") {
  await openFormDialog({
    title: targetType === "ip" ? "添加 IP 白名单" : "添加用户白名单",
    initialForm: { targetValue: "", reason: "" },
    columns: {
      targetValue: { title: targetType === "ip" ? "IP 地址" : "用户 ID", type: "input", form: { rules: [{ required: true, message: targetType === "ip" ? "请输入 IP 地址" : "请输入用户 ID" }] } },
      reason: { title: "备注", type: "input", form: { helper: "可选" } },
    },
    async onSubmit(form: any) {
      await securityMonitorApi.addBan({ targetType, targetValue: String(form.targetValue).trim(), action: "allow", scope: "access", reason: form.reason || "" });
      notification.success({ message: "白名单已添加" });
      await tableRef.value?.refresh();
      emit("changed");
    },
  });
}
async function remove(record: SecurityBan) {
  state.removingId = record.id;
  try {
    await securityMonitorApi.removeBan(record.id);
    notification.success({ message: "白名单已移除" });
    await tableRef.value?.refresh();
    emit("changed");
  } finally {
    state.removingId = 0;
  }
}
function renderTarget(record: SecurityBan) {
  if (record.targetType === "ip") return <span class="security-allow-manager__code">{record.targetValue}</span>;
  return (
    <span class="security-allow-manager__target">
      <strong>{record.targetValue}</strong>
      <small>用户 ID {record.targetValue}</small>
    </span>
  );
}
function renderType(record: SecurityBan) {
  return <span class={`security-allow-manager__pill ${record.targetType}`}>{record.targetType === "ip" ? "IP 白名单" : "用户白名单"}</span>;
}
function renderReason(record: SecurityBan) {
  const reason = record.reason || (record.targetType === "ip" ? "仅跳过 IP 扫描封禁" : "跳过风险检测与自动处置");
  return (
    <span class="security-allow-manager__reason">
      {reason}
      <small>{record.targetType === "ip" ? "IP 扫描规则" : "账号风险规则"}</small>
    </span>
  );
}
function renderDate(value: string) {
  const date = new Date(value);
  return (
    <span class="security-allow-manager__date">
      {date.toLocaleDateString("zh-CN")}
      <small>{date.toLocaleTimeString("zh-CN", { hour12: false })}</small>
    </span>
  );
}
function renderAction(record: SecurityBan) {
  return (
    <a-button type="link" danger size="small" loading={state.removingId === record.id} onClick={() => remove(record)}>
      移除
    </a-button>
  );
}
</script>

<style lang="less">
.security-allow-manager {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  .fn-table {
    min-height: 0;
    flex: 1;
  }
  .security-allow-manager__note {
    margin: 0 20px 12px;
    padding: 11px 13px;
    border-left: 3px solid #4b9c8e;
    background: #eff8f6;
    color: #42655f;
    font-size: 12px;
    line-height: 1.55;
  }
  .security-allow-manager__code {
    font-family: ui-monospace, Consolas, monospace;
    font-size: 12px;
  }
  .security-allow-manager__target,
  .security-allow-manager__reason,
  .security-allow-manager__date {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .security-allow-manager__target strong {
    color: #304d5d;
  }
  .security-allow-manager__target small,
  .security-allow-manager__reason small,
  .security-allow-manager__date small {
    color: #98a5aa;
    font-size: 11px;
  }
  .security-allow-manager__pill {
    display: inline-flex;
    width: fit-content;
    padding: 4px 7px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 650;
  }
  .security-allow-manager__pill.ip {
    color: #38678c;
    background: #eaf2f8;
  }
  .security-allow-manager__pill.user {
    color: #087469;
    background: #e3f3f0;
  }
}
.dark .security-allow-manager {
  .security-allow-manager__note {
    border-color: #347e72;
    background: #172b28;
    color: #b7d4cf;
  }
  .security-allow-manager__target strong {
    color: rgba(255, 255, 255, 0.85);
  }
  .security-allow-manager__pill.ip {
    color: #91caff;
    background: #111d2c;
  }
  .security-allow-manager__pill.user {
    color: #5cdbd3;
    background: #112a27;
  }
}
</style>
