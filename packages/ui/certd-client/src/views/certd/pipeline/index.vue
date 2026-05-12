<template>
  <fs-page class="page-cert">
    <template #header>
      <div class="title">
        {{ t("certd.myPipelines") }}
        <span class="sub">{{ t("certd.pipelinePage.myPipelinesDesc") }}</span>
      </div>
    </template>
    <!-- <a-alert v-if="settingStore.sysPublic.notice" type="warning" show-icon>
      <template #message>
        {{ settingStore.sysPublic.notice }}
      </template>
    </a-alert> -->
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #actionbar-right>
        <a-dropdown v-if="hasActionPermission('write')" class="ml-1">
          <a-button type="primary" class="ant-dropdown-link" @click.prevent>
            {{ t("certd.pipelinePage.addMore") }}
            <DownOutlined />
          </a-button>
          <template #overlay>
            <a-menu @click="onActionbarMoreItemClick">
              <!-- <a-menu-item key="CertApplyUpload" class="flex items-center">
                <fs-icon icon="ion:business-outline" />
                商用证书托管流水线
              </a-menu-item> -->
              <a-menu-item v-for="item in addMorePipelineBtns" :key="item.key" :title="item.title">
                <div class="flex items-center">
                  <fs-icon :icon="item.icon" />
                  <span class="ml-2">{{ item.title }}</span>
                </div>
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </template>
      <div v-if="selectedRowKeys.length > 0" class="batch-actions">
        <div class="batch-actions-inner overflow-x-auto">
          <span class="mr-2 inline-flex whitespace-nowrap">{{ t("certd.selectedCount", { count: selectedRowKeys.length }) }}</span>
          <fs-button v-if="hasActionPermission('write')" icon="ion:trash-outline" class="color-red" type="link" :text="t('certd.batchDelete')" @click="batchDelete"></fs-button>
          <batch-rerun :selected-row-keys="selectedRowKeys" @change="batchFinished"></batch-rerun>
          <change-group v-if="hasActionPermission('write')" :selected-row-keys="selectedRowKeys" @change="batchFinished"></change-group>
          <change-cert-apply-options v-if="hasActionPermission('write')" :selected-row-keys="selectedRowKeys" @change="batchFinished"></change-cert-apply-options>
          <change-notification v-if="hasActionPermission('write')" :selected-row-keys="selectedRowKeys" @change="batchFinished"></change-notification>
          <change-trigger v-if="hasActionPermission('write')" :selected-row-keys="selectedRowKeys" @change="batchFinished"></change-trigger>
          <change-project v-if="hasActionPermission('write') && settingStore.isEnterprise" :selected-row-keys="selectedRowKeys" @change="batchFinished"></change-project>
        </div>
      </div>
      <template #form-bottom>
        <div>{{ t("certd.applyCertificate") }}</div>
      </template>
    </fs-crud>
    <fs-form-wrapper ref="formWrapperRef"></fs-form-wrapper>
  </fs-page>
</template>

<script lang="ts" setup>
import { computed, onActivated, onMounted, provide, ref } from "vue";
import { dict, useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import ChangeGroup from "./components/change-group.vue";
import ChangeCertApplyOptions from "./components/change-cert-apply-options.vue";
import ChangeTrigger from "./components/change-trigger.vue";
import ChangeProject from "./components/change-project.vue";

import BatchRerun from "./components/batch-rerun.vue";
import { Modal, notification } from "ant-design-vue";
import * as api from "./api";
import { useI18n } from "/src/locales";

const { t } = useI18n();
import ChangeNotification from "/@/views/certd/pipeline/components/change-notification.vue";
import { useSettingStore } from "/@/store/settings";
import { groupDictRef } from "./group/dicts";
import { useCertPipelineCreator } from "./certd-form/use";
import { useRouter } from "vue-router";
import { useCrudPermission } from "/@/plugin/permission";
import CertdForm from "./certd-form/certd-form.vue";

defineOptions({
  name: "PipelineManager",
});

const selectedRowKeys = ref([]);
const context: any = {
  selectedRowKeys,
};
const router = useRouter();

function onActionbarMoreItemClick(req: { key: string; item: any }) {
  openCertApplyDialog({ key: req.key, title: req.item?.title });
}

const currentPluginRef = ref();
provide("getCurrentPluginDefine", () => {
  return currentPluginRef;
});

const addMorePipelineBtns = computed(() => {
  return [
    { key: "CertApplyGetFormAliyun", title: t("certd.pipelinePage.aliyunSubscriptionPipeline"), icon: "svg:icon-aliyun" },
    { key: "CertApplyLego", title: t("certd.pipelinePage.legoCertPipeline"), icon: "cbi:lego" },
    { key: "AddPipeline", title: t("certd.pipelinePage.customPipeline"), icon: "ion:add-circle-outline" },
    { key: "BatchAddPipeline", title: t("certd.pipelinePage.batchAddPipeline"), icon: "ion:duplicate" },
  ];
});

const formWrapperRef = ref<any>();
const { openAddCertdPipelineDialog } = useCertPipelineCreator({ formWrapperRef });
function openCertApplyDialog(req: { key: string; title: string }) {
  if (req.key === "AddPipeline") {
    crudExpose.openAdd({});
    return;
  }
  if (req.key === "BatchAddPipeline") {
    router.push({ path: "/certd/pipeline/template" });
    return;
  }

  const searchForm = crudExpose.getSearchValidatedFormData();
  const defaultGroupId = searchForm.groupId;
  openAddCertdPipelineDialog({ pluginName: req.key, defaultGroupId, title: req.title, currentPluginRef });
}
context.openCertApplyDialog = openCertApplyDialog;
context.permission = { isProjectPermission: true };

const { hasActionPermission } = useCrudPermission({ permission: { isProjectPermission: true } });
context.hasActionPermission = hasActionPermission;
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
