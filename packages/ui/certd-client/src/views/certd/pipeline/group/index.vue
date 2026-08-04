<template>
  <fs-page>
    <template #header>
      <div class="title">
        Pipeline Group Management
        <span class="sub">Manage pipeline groups</span>
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
