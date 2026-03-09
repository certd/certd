<template>
  <fs-page>
    <template #header>
      <div class="title">
        通知管理
        <span class="sub">管理通知配置</span>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding"> </fs-crud>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, onActivated, onMounted } from "vue";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { createAddonApi } from "./api";
import { addonProvide } from "/@/views/certd/addon/common";

export default defineComponent({
  name: "AddonManager",
  setup() {
    const api = createAddonApi({ from: "user", addonType: "" });
    addonProvide(api);
    const { crudBinding, crudRef, crudExpose } = useFs({
      createCrudOptions,
      context: { api, permission: { isProjectPermission: true } },
    });

    // 页面打开后获取列表数据
    onMounted(() => {
      crudExpose.doRefresh();
    });
    onActivated(() => {
      crudExpose.doRefresh();
    });

    return {
      crudBinding,
      crudRef,
    };
  },
});
</script>
