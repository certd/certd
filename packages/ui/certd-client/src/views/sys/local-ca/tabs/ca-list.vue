<template>
  <div class="local-ca-tab-ca-list">
    <fs-crud ref="crudRef" class="local-ca-crud" v-bind="crudBinding"></fs-crud>
    <LocalCaView ref="caViewRef" :on-export="row => caExportHandler?.(row)" :on-acme-enable="row => caAcmeEnableHandler?.(row)" :on-changed="() => crudExpose.doRefresh()" />
    <LocalCaManageDialog v-model:open="manageOpen" :ca-id="manageCaId" :tab="manageTab" />
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "../crud";
import LocalCaView from "../ca-view.vue";
import LocalCaManageDialog from "../ca-manage-dialog.vue";
import { useMounted } from "/@/use/use-mounted";

defineOptions({
  name: "LocalCaTabCaList",
});

const route = useRoute();
const caViewRef = ref<any>();
const caExportHandler = ref<any>();
const caAcmeEnableHandler = ref<any>();
const manageOpen = ref(false);
const manageCaId = ref<number | undefined>();
const manageTab = ref<string | undefined>("permissions");

function openManageDialog(row: any) {
  manageCaId.value = Number(row.id);
  manageTab.value = "permissions";
  manageOpen.value = true;
}

const context: any = {
  caViewRef,
  caExportHandler,
  caAcmeEnableHandler,
  openManageDialog,
};
const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context });

useMounted(async () => {
  await crudExpose.doRefresh();
});

onMounted(() => {
  const caId = Number(route.query.caId);
  const tab = route.query.tab as string;
  if (caId && tab) {
    manageCaId.value = caId;
    manageTab.value = tab;
    manageOpen.value = true;
  }
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
