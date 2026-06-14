<template>
  <fs-page class="page-cert-dns-persist">
    <template #header>
      <div class="title">
        DNS持久验证记录
        <span class="red sub" style="color: red">当前仅 Let's Encrypt 测试环境可以申请 DNS 持久验证证书。</span>
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
