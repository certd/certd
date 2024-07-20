<template>
  <fs-page class="fs-pipeline-detail">
    <pipeline-edit v-model:edit-mode="editMode" :pipeline-id="pipelineId" :options="pipelineOptionsRef"></pipeline-edit>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, Ref, ref } from "vue";
import PipelineEdit from "./pipeline/index.vue";
import * as pluginApi from "./api.plugin";
import * as historyApi from "./api.history";
import * as api from "./api";
import { useRoute } from "vue-router";
import { PipelineDetail, PipelineOptions, PluginGroups, RunHistory } from "./pipeline/type";

export default defineComponent({
  name: "PipelineDetail",
  components: { PipelineEdit },
  setup() {
    const route = useRoute();
    const pipelineId: Ref = ref(route.query.id);

    const pipelineOptions: PipelineOptions = {
      async getPipelineDetail({ pipelineId }) {
        const detail = await api.GetDetail(pipelineId);
        return {
          pipeline: {
            id: detail.pipeline.id,
            stages: [],
            triggers: [],
            ...JSON.parse(detail.pipeline.content || "{}")
          }
        } as PipelineDetail;
      },

      async getHistoryList({ pipelineId }) {
        const list: RunHistory[] = await historyApi.GetList({ pipelineId });
        return list;
      },

      async getHistoryDetail({ historyId }): Promise<RunHistory> {
        const detail = await historyApi.GetDetail({ id: historyId });
        return detail;
      },

      async getPluginGroups() {
        const groups = await pluginApi.GetGroups({});
        return new PluginGroups(groups);
      },

      async doSave(pipelineConfig: any) {
        await api.Save({
          id: pipelineConfig.id,
          content: JSON.stringify(pipelineConfig)
        });
      },
      async doTrigger(options: { pipelineId: number }) {
        const { pipelineId } = options;
        await api.Trigger(pipelineId);
      }
    };

    const pipelineOptionsRef: Ref<PipelineOptions> = ref(pipelineOptions);

    const editMode = ref(false);
    if (route.query.editMode !== "false") {
      editMode.value = true;
    }

    return {
      pipelineOptionsRef,
      pipelineId,
      editMode
    };
  }
});
</script>
<style lang="less">
.page-pipeline-detail {
}
</style>
