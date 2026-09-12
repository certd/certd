<template>
  <fs-page>
    <template #header>
      <div class="title">
        余额管理
        <span class="sub">管理用户余额，可给用户充值</span>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding"> </fs-crud>
  </fs-page>
</template>

<script lang="ts" setup>
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { useMounted } from "/@/use/use-mounted";

defineOptions({
  name: "SysWallet",
});

const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions });

// 页面打开后获取列表数据
useMounted(async () => {
  await crudExpose.doRefresh();
});
</script>
