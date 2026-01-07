<template>
  <fs-page class="page-cert">
    <template #header>
      <div class="title">{{ t("certd.myPipelines") }}</div>
    </template>
    <a-alert v-if="settingStore.sysPublic.notice" type="warning" show-icon>
      <template #message>
        {{ settingStore.sysPublic.notice }}
      </template>
    </a-alert>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <div v-if="selectedRowKeys.length > 0" class="batch-actions">
        <div class="batch-actions-inner">
          <span>{{ t("certd.selectedCount", { count: selectedRowKeys.length }) }}</span>
          <fs-button icon="ion:trash-outline" class="color-red" type="link" :text="t('certd.batchDelete')" @click="batchDelete"></fs-button>
          <batch-rerun :selected-row-keys="selectedRowKeys" @change="batchFinished"></batch-rerun>
          <change-group :selected-row-keys="selectedRowKeys" @change="batchFinished"></change-group>
          <change-notification :selected-row-keys="selectedRowKeys" @change="batchFinished"></change-notification>
          <change-trigger :selected-row-keys="selectedRowKeys" @change="batchFinished"></change-trigger>
        </div>
      </div>
      <template #actionbar-right> </template>
      <template #form-bottom>
        <div>{{ t("certd.applyCertificate") }}</div>
      </template>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts" setup>
import { onActivated, onMounted, ref } from "vue";
import { dict, useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import ChangeGroup from "./components/change-group.vue";
import ChangeTrigger from "./components/change-trigger.vue";
import BatchRerun from "./components/batch-rerun.vue";
import { Modal, notification } from "ant-design-vue";
import * as api from "./api";
import { useI18n } from "/src/locales";

const { t } = useI18n();
import ChangeNotification from "/@/views/certd/pipeline/components/change-notification.vue";
import { useSettingStore } from "/@/store/settings";
import { groupDictRef } from "./group/dicts";

defineOptions({
  name: "PipelineManager",
});

const selectedRowKeys = ref([]);
const context: any = {
  selectedRowKeys,
};
const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context });

// 页面打开后获取列表数据
onMounted(() => {
  crudExpose.doRefresh();
});

onActivated(async () => {
  await groupDictRef.reloadDict();
  await crudExpose.doRefresh();
});

const settingStore = useSettingStore();

function batchFinished() {
  if (settingStore) crudExpose.doRefresh();
  selectedRowKeys.value = [];
}
function batchDelete() {
  Modal.confirm({
    title: "确认删除",
    content: "确定要删除选中的数据吗？",
    async onOk() {
      await api.BatchDelete(selectedRowKeys.value);
      notification.success({ message: "删除成功" });
      await crudExpose.doRefresh();
      selectedRowKeys.value = [];
    },
  });
}
</script>
<style lang="less">
.batch-actions {
  position: absolute;
  z-index: 100;
  line-height: 40px;
  display: flex;
  align-items: center;
  height: 37.86px;
  width: 100%;
  overflow: hidden;
  margin-top: 1px;
  padding-left: 48px;
  pointer-events: none;

  .batch-actions-inner {
    pointer-events: auto;
    display: flex;
    align-items: center;
    width: 100%;
    background-color: #fafafa;
    padding-left: 10px;
  }
}

.cert_pipeline_create_form {
  .ant-collapse {
    margin: 10px;
  }
  .ant-collapse-header {
    text-align: right;
  }
}
</style>
