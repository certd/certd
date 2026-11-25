<template>
  <div class="local-ca-tab-ca-list">
    <fs-crud ref="crudRef" class="local-ca-crud" v-bind="crudBinding"></fs-crud>
    <LocalCaView ref="caViewRef" :on-export="row => caExportHandler?.(row)" :on-acme-enable="row => caAcmeEnableHandler?.(row)" :on-changed="() => crudExpose.doRefresh()" />
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "../crud";
import LocalCaView from "../ca-view.vue";
import { useMounted } from "/@/use/use-mounted";

defineOptions({
  name: "LocalCaTabCaList",
});

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
.local-ca-tab-ca-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;

  .local-ca-crud {
    flex: 1;
    min-height: 0;
  }
}
</style>
