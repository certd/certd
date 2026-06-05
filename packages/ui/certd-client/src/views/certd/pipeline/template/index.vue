<template>
  <fs-page>
    <template #header>
      <div class="title flex items-center">
        {{ t("certd.template.title") }}
        <span class="ml-10 sub flex items-center">
          <span>{{ t("certd.template.intro") }} </span>
          <vip-button class="ml-10" mode="button" />
        </span>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding"> </fs-crud>
  </fs-page>
</template>

<script lang="ts" setup>
import { useMounted } from "/@/use/use-mounted";
import { onActivated, onMounted } from "vue";
import { useMounted } from "/@/use/use-mounted";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { useMounted } from "/@/use/use-mounted";
import { useI18n } from "/src/locales";
defineOptions({
  name: "PipelineTemplate",
});
const { crudBinding, crudRef, crudExpose } = useFs({
  createCrudOptions,
  context: {
    permission: { isProjectPermission: true },
  },
});
const { t } = useI18n();
useMounted(() => crudExpose.doRefresh());
</script>
