<template>
  <fs-page class="page-cert-dns-persist">
    <template #header>
      <div>
        <div class="title">DNS持久验证记录</div>
        <div class="text-orange-500 mt-5">当前仅 Let's Encrypt 测试环境可以申请 DNS 持久验证证书。</div>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding"></fs-crud>
  </fs-page>
</template>

<script lang="ts" setup>
import { onActivated, onMounted } from "vue";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";

defineOptions({
  name: "DnsPersistRecord",
});

const context: any = {
  permission: { isProjectPermission: true },
};
const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context });

onMounted(() => {
  crudExpose.doRefresh();
});
onActivated(async () => {
  await crudExpose.doRefresh();
});
</script>
