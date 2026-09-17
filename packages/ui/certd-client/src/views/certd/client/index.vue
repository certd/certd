<template>
  <fs-page>
    <template #header>
      <div class="title flex items-center">
        {{ t("certd.client.title") }}
        <div class="sub flex-1">
          <div>
            {{ t("certd.client.description") }}
          </div>
          <div v-if="!settingStore.isPlus" class="flex items-center">
            {{ t("certd.client.plusRequired") }}
            <vip-button class="ml-5" mode="nav"></vip-button>
          </div>
        </div>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding"></fs-crud>
  </fs-page>
</template>

<script lang="ts" setup>
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { useMounted } from "/@/use/use-mounted";
import { useSettingStore } from "/@/store/settings";
import { useI18n } from "/src/locales";
const { t } = useI18n();
const settingStore = useSettingStore();
defineOptions({
  name: "ClientManager",
});
const context: any = {
  permission: {
    isProjectPermission: true,
  },
};
const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context });

useMounted(() => crudExpose.doRefresh());
</script>
