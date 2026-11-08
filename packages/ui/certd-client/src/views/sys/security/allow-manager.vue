<template>
  <div class="security-allow-manager">
    <FnCrud ref="tableRef" v-bind="tableOptions">
      <template #header>
        <p class="mb-2">IP 和用户白名单可跳过 IP 访问封禁及扫描自动封禁，风险检测和记录仍会保留。白名单不会绕过账号权限、用户访问封禁或流水线运行限制，也不影响非常用 IP 提醒。</p>
      </template>
    </FnCrud>
  </div>
</template>

<script lang="tsx" setup>
import { computed, onMounted, ref } from "vue";
import { notification } from "ant-design-vue";
import { compute, DictStore, FnCrud, type FnCrudOptions, type FnTablePageQuery, type FnTablePageResult } from "/@/components/table";
import { request } from "/@/api/service";
import { SecurityBan, securityMonitorApi } from "./api";
import { validateIpAddress } from "/@/plugin/validator";

const emit = defineEmits<{ changed: [] }>();
const tableRef = ref<InstanceType<typeof FnCrud>>();
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
    { label: "全部", value: "" },
    { label: "IP 白名单", value: "ip" },
    { label: "用户白名单", value: "user" },
  ],
});
const columns = {
  targetType: {
    key: "targetType",
    title: "白名单类型",
    cell: { show: false },
    form: {
      order: 0,
      span: 24,
      value: "ip",
      component: compute(({ form }) => ({
        name: "a-radio-group",
        vModel: "value",
        options: [
          { label: "IP 白名单", value: "ip" },
          { label: "用户白名单", value: "user" },
        ],
        onChange: () => {
          form!.targetValue = undefined;
        },
      })),
    },
  },
  targetValue: {
    key: "targetValue",
    title: "白名单目标",
    cell: { order: 1, width: 180, render: ({ row }: { row: SecurityBan }) => renderTarget(row) },
    form: {
      order: 1,
      title: compute(({ form }) => {
        if (form?.targetType === "user") {
          return "用户";
        }
        return "IP 地址";
      }),
      rules: compute(({ form }) => {
        if (form?.targetType === "user") {
          return [{ required: true, message: "请选择用户" }];
        }
        return [
          { required: true, whitespace: true, message: "请输入 IP 地址" },
          { validator: validateIpAddress, trigger: "blur" },
        ];
      }),
      component: compute(({ form }) => {
        if (form?.targetType === "user") {
          return { name: "a-select", vModel: "value", options: userDict.Props.value, showSearch: true, optionFilterProp: "label", allowClear: true, placeholder: "请选择用户" };
        }
        return { name: "a-input", vModel: "value", placeholder: "请输入 IP 地址" };
      }),
    },
  },
  type: { key: "type", title: "类型", cell: { order: 2, width: 150, dict: typeDict, render: ({ row }: { row: SecurityBan }) => renderType(row) } },
  reason: { key: "reason", title: "备注", cell: { order: 3, width: 280, render: ({ row }: { row: SecurityBan }) => renderReason(row) }, form: { order: 2, helper: "可选" } },
  createTime: { key: "createTime", title: "添加时间", cell: { order: 4, width: 180, render: ({ row }: { row: SecurityBan }) => renderDate(row.createTime) } },
  operator: { key: "operator", title: "添加人", cell: { order: 5, width: 150, render: () => "—" } },
};
const tableOptions = computed<FnCrudOptions<SecurityBan>>(() => ({
  layout: [
    { style: {}, cols: [{ type: "header", style: {} }] },
    {
      style: {},
      cols: [
        { type: "actionbar", style: {} },
        { type: "tabs", style: { flex: 1 } },
        { type: "search", style: {} },
      ],
    },
  ],
  search: { columns: { keyword: { order: 1, component: { name: "a-input", vModel: "value", placeholder: "搜索 IP、用户 ID 或备注", allowClear: true }, width: 250 } } },
  columns,
  form: {
    dialog: { title: "添加白名单", buttons: { confirm: { text: "保存" } } },
    onSubmit: async ({ form }) => {
      await securityMonitorApi.addBan({ targetType: form!.targetType, targetValue: String(form!.targetValue).trim(), action: "allow", scope: "access", reason: form!.reason || "" });
      notification.success({ message: "白名单已添加" });
      emit("changed");
    },
  },
  rowHandle: { order: 6, width: 100, buttons: { edit: { show: false } } },
  request: {
    pageRequest,
    delRequest: async id => {
      await securityMonitorApi.removeBan(Number(id));
      emit("changed");
    },
  },
  tabs: { refCol: "type" },
  table: { minWidth: 980, rowKey: "id", emptyText: "暂无白名单记录" },
  pagination: { current: 1, pageSize: 20, pageSizeProps: ["10", "20", "30", "50"], showTotal: total => `共 ${total} 条` },
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
function renderTarget(record: SecurityBan) {
  if (record.targetType === "ip") return <span class="security-allow-manager__code">{record.targetValue}</span>;
  const user = userDict.Props.value.find(item => item.value === String(record.targetValue));
  const username = user?.label || record.targetValue;
  return (
    <span class="security-allow-manager__target">
      <strong>{username}</strong>
      <small>用户 ID {record.targetValue}</small>
    </span>
  );
}
function renderType(record: SecurityBan) {
  return <span class={`security-allow-manager__pill ${record.targetType}`}>{record.targetType === "ip" ? "IP 白名单" : "用户白名单"}</span>;
}
function renderReason(record: SecurityBan) {
  const reason = record.reason || "跳过 IP 访问封禁及扫描自动封禁";
  return (
    <span class="security-allow-manager__reason">
      {reason}
      <small>风险检测和记录仍会保留</small>
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

async function refresh() {
  await tableRef.value?.refresh();
}

defineExpose({ refresh });
</script>

<style lang="less">
.security-allow-manager {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  .fn-crud {
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
