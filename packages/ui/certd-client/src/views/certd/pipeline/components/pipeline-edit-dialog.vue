<template>
  <a-modal v-model:open="open" title="编辑流水线" width="min(1540px, calc(100vw - 48px))" :footer="null" destroy-on-close class="pipeline-edit-dialog">
    <div class="pipeline-edit-dialog__body">
      <PipelineEdit v-if="pipelineId" v-model:edit-mode="editMode" :pipeline-id="Number(pipelineId)" :options="pipelineOptions" />
    </div>
  </a-modal>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import PipelineEdit from "../pipeline/index.vue";
import * as api from "../api";
import * as historyApi from "../api.history";
import { PipelineDetail, PipelineOptions, RunHistory } from "../pipeline/type";
import { usePluginStore, PluginGroups } from "/@/store/plugin";

defineProps<{ pipelineId?: number | string }>();
const open = defineModel<boolean>("open", { default: false });
const editMode = ref(true);
const pluginStore = usePluginStore();
const pipelineOptions: PipelineOptions = {
  async getPipelineDetail({ pipelineId }): Promise<PipelineDetail> {
    const detail = await api.GetDetail(pipelineId);
    return {
      pipeline: { stages: [], triggers: [], ...JSON.parse(detail.pipeline.content || "{}"), id: detail.pipeline.id, userId: detail.pipeline.userId, projectId: detail.pipeline.projectId },
      type: detail.pipeline.type,
      from: detail.pipeline.from,
      validTime: detail.pipeline.validTime,
      webhookKey: detail.pipeline.webhookKey,
      id: detail.pipeline.id,
      lastVars: detail.pipeline.lastVars,
    } as PipelineDetail;
  },
  async getHistoryList({ pipelineId }): Promise<RunHistory[]> {
    return await historyApi.GetList({ pipelineId });
  },
  async getHistoryDetail({ historyId }): Promise<RunHistory> {
    return await historyApi.GetDetail({ id: historyId });
  },
  async getPluginGroups(): Promise<PluginGroups> {
    return await pluginStore.getGroups();
  },
  async doSave(pipelineConfig: any) {
    return await api.Save({ id: pipelineConfig.id, content: JSON.stringify(pipelineConfig) });
  },
  async doTrigger({ pipelineId, stepId }) {
    await api.Trigger(pipelineId, stepId);
  },
};
</script>

<style lang="less">
.pipeline-edit-dialog {
  .ant-modal-body {
    min-height: 0;
    padding: 0;
  }

  &__body {
    height: 80vh;
    min-height: 560px;
  }

  .page-pipeline-edit {
    height: 100%;

    :deep(.fs-page-header) {
      display: flex !important;
    }
  }

  .pipeline-edit-dialog__body {
    position: relative;
    padding-top: 10px;
  }
}
</style>
