<template>
  <fs-page>
    <template #header>
      <div class="title">
        流水线分组管理
        <span class="sub">管理流水线分组</span>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding"> </fs-crud>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useMounted } from "/@/use/use-mounted";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";

export default defineComponent({
  name: "PipelineGroupManager",
  setup() {
    const { crudBinding, crudRef, crudExpose } = useFs({
      createCrudOptions,
      context: {
        permission: { isProjectPermission: true },
      },
    });
    useMounted(() => crudExpose.doRefresh());

    return {
      crudBinding,
      crudRef,
    };
  },
});
</script>
