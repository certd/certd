<template>
  <fs-page>
    <template #header>
      <div class="title">
        {{ pageTitle }}
        <span class="sub">{{ pageSub }}</span>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding"> </fs-crud>
  </fs-page>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { useMounted } from "/@/use/use-mounted";

defineOptions({
  name: "SysWalletLog",
});

const route = useRoute();
const isUserLog = computed(() => route.query.userId != null);
const pageTitle = computed(() => {
  if (isUserLog.value) {
    return "用户余额变更记录";
  }
  return "余额变更记录";
});
const pageSub = computed(() => {
  if (isUserLog.value) {
    return "查看该用户的余额变更明细";
  }
  return "查看所有用户的余额变更明细";
});

const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions });

// 页面打开后获取列表数据
useMounted(async () => {
  await crudExpose.doRefresh();
});
</script>
