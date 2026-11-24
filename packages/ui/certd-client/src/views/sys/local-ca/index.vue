<template>
  <fs-page class="page-local-ca">
    <template #header>
      <div class="title">{{ t("certd.localCa.title") }}</div>
      <div class="sub">{{ t("certd.localCa.description") }}</div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding"></fs-crud>
    <LocalCaView ref="caViewRef" :on-export="row => caExportHandler?.(row)" :on-acme-enable="row => caAcmeEnableHandler?.(row)" :on-changed="() => crudExpose.doRefresh()" />
  </fs-page>
</template>

<script lang="ts" setup>
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import LocalCaView from "./ca-view.vue";
import { useMounted } from "/@/use/use-mounted";
import { useI18n } from "/src/locales";
import { ref } from "vue";

defineOptions({
  name: "LocalCaManager",
});

const { t } = useI18n();
const caViewRef = ref<any>();
const caExportHandler = ref<any>();
const caAcmeEnableHandler = ref<any>();
const context: any = {
  caViewRef,
  caExportHandler,
  caAcmeEnableHandler,
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
  .ant-switch-disabled {
    opacity: 0.45;
    cursor: not-allowed;
    background: #d9d9d9;
    &.ant-switch-checked {
      background: #bfbfbf;
    }
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
