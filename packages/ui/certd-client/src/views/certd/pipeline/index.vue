<template>
  <fs-page class="page-cert">
    <template #header>
      <div class="title">{{ t("certd.myPipelines") }}</div>
    </template>
    <!-- <a-alert v-if="settingStore.sysPublic.notice" type="warning" show-icon>
      <template #message>
        {{ settingStore.sysPublic.notice }}
      </template>
    </a-alert> -->
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #actionbar-right="scope">
        <a-dropdown class="ml-1">
          <a-button type="primary" class="ant-dropdown-link" @click.prevent>
            更多流水线
            <DownOutlined />
          </a-button>
          <template #overlay>
            <a-menu @click="openCertApplyDialog">
              <!-- <a-menu-item key="CertApplyUpload" class="flex items-center">
                <fs-icon icon="ion:business-outline" />
                商用证书托管流水线
              </a-menu-item> -->
              <a-menu-item key="CertApplyGetFormAliyun">
                <div class="flex items-center">
                  <fs-icon icon="svg:icon-aliyun" />
                  <span class="ml-2">阿里云订阅证书流水线</span>
                </div>
              </a-menu-item>
              <a-menu-item key="CertApplyLego">
                <div class="flex items-center">
                  <fs-icon icon="cbi:lego" />
                  <span class="ml-2">Lego申请证书流水线</span>
                </div>
              </a-menu-item>
              <a-menu-item key="AddPipeline">
                <div class="flex items-center">
                  <fs-icon icon="ion:add-circle-outline" />
                  <span class="ml-2">自定义流水线</span>
                </div>
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </template>
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
      <template #form-bottom>
        <div>{{ t("certd.applyCertificate") }}</div>
      </template>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts" setup>
import { computed, onActivated, onMounted, ref } from "vue";
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
import { useCertPipelineCreator } from "./certd-form/use";

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
const { openAddCertdPipelineDialog } = useCertPipelineCreator();
const addMorePipelineBtns = computed(() => {
  return [
    { key: "CertApplyGetFormAliyun", title: t("certd.aliyunSubscriptionPipeline"), icon: "svg:icon-aliyun" },
    { key: "CertApplyLego", title: t("certd.legoApplicationPipeline"), icon: "cbi:lego" },
    { key: "AddPipeline", title: t("certd.customPipeline"), icon: "ion:add-circle-outline" },
  ];
});
function openCertApplyDialog(req: { key: string; title: string }) {
  if (req.key === "AddPipeline") {
    crudExpose.openAdd({});
    return;
  }

  const searchForm = crudExpose.getSearchValidatedFormData();
  const defaultGroupId = searchForm.groupId;
  openAddCertdPipelineDialog({ pluginName: req.key, defaultGroupId, title: req.title });
}
context.openCertApplyDialog = openCertApplyDialog;
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
