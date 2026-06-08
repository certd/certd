<template>
  <fs-page>
    <template #header>
      <div class="title flex-baseline">
        我的套餐
        <div class="sub">
          <div class="flex-o flex-wrap">当前套餐：<suite-card></suite-card></div>
        </div>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #actionbar-right> </template>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts" setup>
import { useFs } from "@fast-crud/fast-crud";
import { computed, ref } from "vue";
import createCrudOptions from "./crud";
import { mySuiteApi, SuiteDetail } from "/@/views/certd/suite/mine/api";
import SuiteCard from "/@/views/framework/home/dashboard/suite-card.vue";
import { useMounted } from "/@/use/use-mounted";
defineOptions({
  name: "MySuite",
});
const detail = ref<SuiteDetail>({});
const currentSuite = computed(() => {
  if (detail.value?.suites && detail.value.suites.length > 0) {
    return detail.value.suites[0];
  }
  return null;
});

const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context: { detail, currentSuite } });

async function loadSuiteDetail() {
  detail.value = await mySuiteApi.SuiteDetailGet();
}

// 页面打开后获取列表数据
useMounted(async () => {
  await loadSuiteDetail();
  await crudExpose.doRefresh();
});
</script>
