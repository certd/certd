<template>
  <fs-page>
    <template #header>
      <div class="title flex items-center">
        {{ t("monitor.title") }}
        <div class="sub flex-1">
          <div>
            {{ t("monitor.description") }}
            <router-link to="/certd/monitor/setting">{{ t("monitor.settingLink") }}</router-link>
          </div>
          <div class="flex items-center">
            {{ t("monitor.limitInfo") }}
            <vip-button class="ml-5" mode="nav"></vip-button>
          </div>
        </div>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #pagination-left>
        <a-tooltip :title="t('monitor.batchDelete')">
          <fs-button icon="DeleteOutlined" @click="handleBatchDelete"></fs-button>
        </a-tooltip>
      </template>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts" setup>
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { useMounted } from "/@/use/use-mounted";
import { useI18n } from "/src/locales";
const { t } = useI18n();
defineOptions({
  name: "SiteCertMonitor",
});
const context: any = {
  permission: {
    isProjectPermission: true,
  },
};
const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context });

const handleBatchDelete = context.handleBatchDelete;
useMounted(() => crudExpose.doRefresh());
</script>
