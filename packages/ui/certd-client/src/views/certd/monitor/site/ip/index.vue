<template>
  <div class="site-ip-dialog" style="height: 60vh">
    <fs-crud ref="crudRef" v-bind="crudBinding"> </fs-crud>
  </div>
</template>

<script lang="ts" setup>
import { onActivated, onMounted, ref, Ref } from "vue";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";

defineOptions({
  name: "SiteIpCertMonitor",
});
const props = defineProps<{
  siteId: number;
}>();
const { crudBinding, crudRef, crudExpose } = useFs({
  createCrudOptions,
  context: {
    props,
  },
});

// 页面打开后获取列表数据
onMounted(() => {
  // crudExpose.doRefresh();
});
onActivated(() => {
  crudExpose.doRefresh();
});
</script>
