<template>
  <div class="security-ban-manager">
    <FnCrud ref="tableRef" v-bind="tableOptions">
      <template #header>
        <p>封禁管理</p>
      </template>
    </FnCrud>
  </div>
</template>

<script lang="tsx" setup>
import { computed, ref } from "vue";
import { notification } from "ant-design-vue";
import { compute, DictStore, FnCrud, FnModal, type FnCrudOptions, type FnTablePageQuery, type FnTablePageResult } from "/@/components/table";
import { SecurityBan, securityMonitorApi } from "./api";

const emit = defineEmits<{ changed: [] }>();
const tableRef = ref<{ refresh: () => Promise<void> }>();
const typeDict = new DictStore({
  data: [
    { label: "全部生效中", value: "" },
    { label: "IP 封禁", value: "ip" },
    { label: "禁止运行流水线", value: "pipeline" },
    { label: "禁止访问", value: "access" },
  ],
});
const columns = {
  targetValue: { key: "targetValue", title: "封禁目标", cell: { order: 1, width: 170, render: ({ row }: { row: SecurityBan }) => renderTarget(row) } },
  type: { key: "type", title: "类型", cell: { order: 2, width: 180, dict: typeDict, render: ({ row }: { row: SecurityBan }) => renderType(row) } },
  detail: { key: "detail", title: "原因 / 来源", cell: { order: 3, width: 260, render: ({ row }: { row: SecurityBan }) => renderDetail(row) } },
  createTime: { key: "createTime", title: "创建时间", cell: { order: 4, width: 165, render: ({ row }: { row: SecurityBan }) => renderDate(row.createTime) } },
  expiresAt: { key: "expiresAt", title: "到期时间", cell: { order: 5, width: 170, render: ({ row }: { row: SecurityBan }) => renderExpiry(row) } },
  operator: { key: "operator", title: "操作人", cell: { order: 6, width: 140, render: () => "—" } },
};
const tableOptions = computed<FnCrudOptions<SecurityBan>>(() => ({
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
  search: { columns: { keyword: { order: 1, component: { name: "a-input", vModel: "value", placeholder: "搜索 IP、用户名或原因", allowClear: true }, width: 250 } } },
  columns,
  rowHandle: {
    width: 170,
    fixed: "right",
    buttons: {
      edit: { show: false },
      delete: { show: false },
      unblock: {
        text: compute(({ row }) => getUnblockLabel(row as SecurityBan)),
        type: "link",
        onClick: ({ row }) => {
          if (row) {
            return confirmUnblock(row as SecurityBan);
          }
        },
      },
    },
  },
  request: { pageRequest },
  tabs: { refCol: "type" },
  table: { minWidth: 1120, rowKey: "id", emptyText: "暂无封禁记录" },
  pagination: { current: 1, pageSize: 20, pageSizeProps: ["10", "20", "30", "50"], showTotal: total => `共 ${total} 条` },
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
function getUnblockLabel(record: SecurityBan) {
  if (record.targetType === "ip") {
    return "解除 IP 封禁";
  }
  if (record.scope === "pipeline") {
    return "解除运行限制";
  }
  return "恢复访问";
}
function confirmUnblock(record: SecurityBan) {
  const label = getUnblockLabel(record);
  return FnModal.confirm({
    title: label,
    body: () => `确定对 ${record.targetValue} 执行“${label}”吗？`,
    buttons: {
      confirm: {
        text: label,
        onClick: async () => {
          await securityMonitorApi.removeBan(record.id);
          notification.success({ message: "封禁已解除" });
          await tableRef.value?.refresh();
          emit("changed");
        },
      },
    },
  });
}
</script>

<style lang="less">
.security-ban-manager {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  .fn-crud {
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
