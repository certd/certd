<template>
  <fs-page>
    <template #header>
      <div class="title">
        系统级授权管理
        <span class="sub">管理第三方系统的授权信息(系统级)</span>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding"> </fs-crud>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, onMounted } from "vue";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "../../certd/access/crud";
import { createAccessApi } from "/@/views/certd/access/api";

export default defineComponent({
  name: "SysAccessManager",
  setup() {
    const api = createAccessApi("sys");
    const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context: { api } });

    // 页面打开后获取列表数据
    onMounted(() => {
      crudExpose.doRefresh();
    });

    return {
      crudBinding,
      crudRef
    };
  }
});
</script>
