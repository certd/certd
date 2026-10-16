<template>
  <fs-page>
    <template #header>
      <div class="title">
        {{ t("certd.navigation.pipelineGroup") }}
        <span class="sub">{{ t("certd.navigation.pipelineGroupHelper") }}</span>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding"> </fs-crud>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useI18n } from "/src/locales";
import { useMounted } from "/@/use/use-mounted";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";

export default defineComponent({
  name: "PipelineGroupManager",
  setup() {
    const { t } = useI18n();
    const { crudBinding, crudRef, crudExpose } = useFs({
      createCrudOptions,
      context: {
        permission: { isProjectPermission: true },
      },
    });
    useMounted(() => crudExpose.doRefresh());

    return {
      t,
      crudBinding,
      crudRef,
    };
  },
});
</script>
