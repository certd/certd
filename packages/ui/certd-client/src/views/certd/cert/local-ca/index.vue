<template>
  <fs-page class="page-local-ca">
    <template #header>
      <div class="title">{{ t("certd.localCa.title") }}</div>
      <div class="sub">{{ t("certd.localCa.description") }}</div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding"></fs-crud>
  </fs-page>
</template>

<script lang="ts" setup>
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { useMounted } from "/@/use/use-mounted";
import { useI18n } from "/src/locales";

defineOptions({
  name: "LocalCaManager",
});

const { t } = useI18n();
const context: any = {
  permission: { isProjectPermission: true },
};
const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context });

useMounted(async () => {
  await crudExpose.doRefresh();
});
</script>

<style lang="less">
.page-local-ca {
  .title {
    font-size: 18px;
    font-weight: 600;
  }
  .sub {
    margin-top: 4px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
  }
}
.dark .page-local-ca {
  .sub {
    color: rgba(255, 255, 255, 0.45);
  }
}
.local-ca-settings {
  width: 100%;
  table-layout: fixed;
  .ant-descriptions-item-content {
    word-break: break-all;
    overflow-wrap: anywhere;
  }
  .fs-copyable {
    max-width: 100%;
    overflow-wrap: anywhere;
  }
}
</style>
