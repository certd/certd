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
import { computed, onMounted, ref } from "vue";
import { notification } from "ant-design-vue";
import { Plus } from "@lucide/vue";
import { compute, DictStore, FnCrud, FnModal, type FnCrudOptions, type FnTablePageQuery, type FnTablePageResult } from "/@/components/table";
import { request } from "/@/api/service";
import { validateIpAddress } from "/@/plugin/validator";
import permissionUtil from "/@/plugin/permission/util.permission";
import { SecurityBan, securityMonitorApi } from "./api";

const emit = defineEmits<{ changed: [] }>();
const tableRef = ref<{ refresh: () => Promise<void> }>();
const userDict = new DictStore({
  data: [],
  getData: async () => {
    const users = await request({ url: "/sys/authority/user/getSimpleUsers", method: "POST" });
    return users.map(user => {
      let label = user.nickName || user.username;
      if (!label && user.mobile) {
        label = `${user.phoneCode || ""}${user.mobile}`;
      }
      if (!label) {
        label = String(user.id);
      }
      return { label, value: String(user.id) };
    });
  },
});
onMounted(() => {
  void userDict.fetch().catch(() => {
    notification.error({ message: "用户列表加载失败" });
  });
});
const typeDict = new DictStore({
  data: [
    { label: "全部生效中", value: "" },
    { label: "IP 封禁", value: "ip" },
    { label: "禁止运行流水线", value: "pipeline" },
    { label: "禁止访问", value: "access" },
  ],
});
const columns = {
  targetType: {
    key: "targetType",
    title: "封禁目标类型",
    cell: { show: false },
    form: {
      order: 0,
      span: 24,
      value: "ip",
      component: compute(({ form }) => ({
        name: "a-radio-group",
        vModel: "value",
        options: [
          { label: "IP", value: "ip" },
          { label: "用户", value: "user" },
          { label: "流水线", value: "pipeline" },
        ],
        onChange: () => {
          form!.targetValue = undefined;
          if (form!.targetType === "pipeline") {
            form!.scope = "pipeline";
          } else {
            form!.scope = "access";
          }
        },
      })),
    },
  },
  targetValue: {
    key: "targetValue",
    title: "封禁目标",
    cell: { order: 1, width: 170, render: ({ row }: { row: SecurityBan }) => renderTarget(row) },
    form: {
      order: 1,
      span: 24,
      title: compute(({ form }) => {
        if (form?.targetType === "user") return "用户";
        if (form?.targetType === "pipeline") return "流水线 ID";
        return "IP 地址";
      }),
      rules: compute(({ form }) => {
        if (form?.targetType === "user") return [{ required: true, message: "请选择用户" }];
        if (form?.targetType === "pipeline") return [{ required: true, type: "number", min: 1, message: "请输入有效的流水线 ID" }];
        return [
          { required: true, whitespace: true, message: "请输入 IP、网段或通配符" },
          { validator: validateIpAddress, trigger: "blur" },
        ];
      }),
      component: compute(({ form }) => {
        if (form?.targetType === "user") {
          return { name: "a-select", vModel: "value", options: userDict.Props.value, showSearch: true, optionFilterProp: "label", allowClear: true, placeholder: "请选择用户" };
        }
        if (form?.targetType === "pipeline") {
          return { name: "a-input-number", vModel: "value", min: 1, precision: 0, placeholder: "请输入流水线 ID" };
        }
        return { name: "a-input", vModel: "value", placeholder: "请输入 IP、网段或通配符" };
      }),
      helper: compute(({ form }) => (form?.targetType === "ip" ? "示例：192.168.1.10、192.168.1.0/24、192.168.*、2001:db8::/32" : undefined)),
    },
  },
  scope: {
    key: "scope",
    title: "封禁范围",
    cell: { show: false },
    form: {
      order: 2,
      span: 24,
      value: "access",
      show: compute(({ form }) => form?.targetType === "user"),
      helper: "禁止访问同时禁止该用户运行流水线；仅禁止运行流水线时仍可访问本站",
      component: {
        name: "a-radio-group",
        vModel: "value",
        options: [
          { label: "禁止访问", value: "access" },
          { label: "禁止运行流水线", value: "pipeline" },
        ],
      },
    },
  },
  type: { key: "type", title: "类型", cell: { order: 2, width: 180, dict: typeDict, render: ({ row }: { row: SecurityBan }) => renderType(row) } },
  reason: { key: "reason", title: "原因 / 来源", cell: { order: 3, width: 260, render: ({ row }: { row: SecurityBan }) => renderDetail(row) }, form: { order: 3, span: 24, helper: "可选，留空记录为手动封禁" } },
  createTime: { key: "createTime", title: "创建时间", cell: { order: 4, width: 165, render: ({ row }: { row: SecurityBan }) => renderDate(row.createTime) } },
  expiresAt: {
    key: "expiresAt",
    title: "到期时间",
    cell: { order: 5, width: 170, render: ({ row }: { row: SecurityBan }) => renderExpiry(row) },
    form: { order: 4, span: 24, helper: "留空为永久封禁，到期后自动失效", component: { name: "a-date-picker", vModel: "value", showTime: true, allowClear: true, placeholder: "选择到期时间" } },
  },
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
        { type: "actionbar", style: {} },
        { type: "tabs", style: { flex: 1 } },
        { type: "search", style: {} },
      ],
    },
  ],
  search: { columns: { keyword: { order: 1, component: { name: "a-input", vModel: "value", placeholder: "搜索 IP、用户 ID、流水线 ID 或原因", allowClear: true }, width: 290 } } },
  columns,
  actionbar: { buttons: { add: { text: "手动添加封禁", icon: Plus, show: permissionUtil.hasPermissions("sys:settings:edit") } } },
  form: {
    dialog: { title: "手动添加封禁", buttons: { confirm: { text: "添加封禁", danger: true } } },
    onSubmit: async ({ form }) => {
      let scope: SecurityBan["scope"] = "access";
      if (form!.targetType === "pipeline" || (form!.targetType === "user" && form!.scope === "pipeline")) {
        scope = "pipeline";
      }
      let expiresAt: string | undefined;
      if (form!.expiresAt) {
        expiresAt = form!.expiresAt.toISOString();
      }
      await securityMonitorApi.addBan({
        targetType: form!.targetType,
        targetValue: String(form!.targetValue).trim(),
        action: "ban",
        scope,
        reason: form!.reason?.trim() || "手动封禁",
        expiresAt,
      });
      notification.success({ message: "封禁已添加" });
      emit("changed");
    },
  },
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
  const user = userDict.Props.value.find(item => item.value === String(record.targetValue));
  let name = record.targetValue;
  let targetLabel = "用户 ID";
  if (record.targetType === "pipeline") {
    targetLabel = "流水线 ID";
  } else if (user) {
    name = user.label;
  }
  return (
    <span class="security-ban-manager__target">
      <strong>{name}</strong>
      <small>
        {targetLabel} {record.targetValue}
      </small>
    </span>
  );
}
function renderType(record: SecurityBan) {
  if (record.targetType === "ip") {
    return <span class="security-ban-manager__pill ip">IP 封禁</span>;
  }
  if (record.scope === "pipeline") {
    return <span class="security-ban-manager__pill ban">禁止运行流水线</span>;
  }
  return (
    <span class="security-ban-manager__detail">
      <span class="security-ban-manager__pill ban">禁止访问</span>
      <small>含禁止运行流水线</small>
    </span>
  );
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

defineExpose({ refresh: () => tableRef.value?.refresh() });
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
