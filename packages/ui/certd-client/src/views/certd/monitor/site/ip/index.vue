<template>
  <div class="site-ip-dialog" style="height: 60vh">
    <fs-crud ref="crudRef" v-bind="crudBinding"> </fs-crud>
  </div>
</template>

<script lang="ts" setup>
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { useMounted } from "/@/use/use-mounted";

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
useMounted(() => crudExpose.doRefresh());
</script>
