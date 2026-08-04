<template>
  <fs-page class="page-cert-dns-persist">
    <template #header>
      <div class="title">
        DNS Persistent Validation Records
        <span class="red sub" style="color: red">Currently, only the Let's Encrypt staging environment can request DNS persistent validation certificates.</span>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding"></fs-crud>
  </fs-page>
</template>

<script lang="ts" setup>
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { useMounted } from "/@/use/use-mounted";

defineOptions({
  name: "DnsPersistRecord",
});

const context: any = {
  permission: { isProjectPermission: true },
};
const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context });

// 页面打开后获取列表数据
useMounted(async () => {
  await crudExpose.doRefresh();
});
</script>
