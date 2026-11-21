<template>
  <FnTableSelect class="user-select" :model-value="modelValue" :crud-options="crudOptions" :dict="dict" title="选择用户" placeholder="请选择用户" @update:model-value="$emit('update:modelValue', $event)" />
</template>

<script setup lang="ts">
import { DictStore, FnTableSelect, type FnCrudOptions } from "/@/components/table";
import { request } from "/@/api/service";

defineProps<{ modelValue?: string | number }>();
defineEmits<{ "update:modelValue": [value: string | number | undefined] }>();

const userLabel = (user: Record<string, any>) => {
  return `${user.nickName || user.mobile || user.username}(${String(user.id)})`;
};
const dict = new DictStore({
  data: [],
  value: "id",
  label: userLabel,
  getDataFunc: async () => {
    return [];
  },
  getNodesByValues: (ids: Array<string | number>) => request({ url: "/sys/authority/user/getSimpleUserByIds", method: "post", data: { ids }, showErrorNotify: false }),
});
const crudOptions: FnCrudOptions = {
  layout: [{ cols: [{ type: "search" }] }],
  columns: {
    id: { key: "id", title: "用户 ID", cell: { width: 90 } },
    username: { key: "username", title: "用户名", cell: { width: 160, ellipsis: true } },
    nickName: { key: "nickName", title: "昵称", cell: { width: 160, ellipsis: true } },
    mobile: { key: "mobile", title: "手机号", cell: { width: 160 } },
  },
  search: {
    columns: {
      username: { component: { name: "a-input", vModel: "value", placeholder: "搜索用户名", allowClear: true } },
      nickName: { component: { name: "a-input", vModel: "value", placeholder: "搜索昵称", allowClear: true } },
    },
  },
  request: {
    pageRequest: query => request({ url: "/sys/authority/user/page", method: "post", data: { ...query, sort: query.sort || { prop: "id", asc: false } }, showErrorNotify: false }),
  },
  pagination: { pageSize: 10 },
};
</script>
