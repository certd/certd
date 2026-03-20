<template>
  <fs-page class="fs-pipeline-detail">
    <pipeline-edit v-model:edit-mode="editMode" :pipeline-id="pipelineId" :history-id="historyId" :options="pipelineOptionsRef"></pipeline-edit>
    <a-tour v-bind="tour" v-model:current="tour.current" />
  </fs-page>
</template>

<script lang="ts" setup>
import { nextTick, Ref, ref } from "vue";
import PipelineEdit from "./pipeline/index.vue";
import * as historyApi from "./api.history";
import * as api from "./api";
import { useRoute } from "vue-router";
import { PipelineDetail, PipelineOptions, RunHistory } from "./pipeline/type";
import { LocalStorage } from "/@/utils/util.storage";
import { useUserStore } from "/@/store/user";
import { usePluginStore, PluginGroups } from "/@/store/plugin";

defineOptions({
  name: "PipelineDetail",
});
const route = useRoute();
const pipelineId: Ref = ref(parseInt((route.query.id as string) || "0"));
const historyId: Ref = ref(parseInt((route.query.historyId as string) || "0"));
const pluginStore = usePluginStore();
const pipelineOptions: PipelineOptions = {
  async getPipelineDetail({ pipelineId }) {
    const detail = await api.GetDetail(pipelineId);
    onLoaded(detail);
    return {
      pipeline: {
        stages: [],
        triggers: [],
        ...JSON.parse(detail.pipeline.content || "{}"),
        id: detail.pipeline.id,
        userId: detail.pipeline.userId,
        projectId: detail.pipeline.projectId,
      },
      type: detail.pipeline.type,
      from: detail.pipeline.from,
      validTime: detail.pipeline.validTime,
      webhookKey: detail.pipeline.webhookKey,
      id: detail.pipeline.id,
      lastVars: detail.pipeline.lastVars,
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

  async getPluginGroups(): Promise<PluginGroups> {
    return await pluginStore.getGroups();
  },

  async doSave(pipelineConfig: any) {
    return await api.Save({
      id: pipelineConfig.id,
      content: JSON.stringify(pipelineConfig),
    });
  },
  async doTrigger(options: { pipelineId: number; stepId?: string }) {
    const { pipelineId, stepId } = options;
    await api.Trigger(pipelineId, stepId);
  },
};

const pipelineOptionsRef: Ref<PipelineOptions> = ref(pipelineOptions);

const editMode = ref(false);
if (route.query.editMode === "true") {
  editMode.value = true;
}

function useTour() {
  const tour = ref({
    open: false,
    current: 0,
    steps: [],
    onClose: () => {
      tour.value.open = false;
    },
    onFinish: () => {
      tour.value.open = false;
      LocalStorage.set("tour-off", true, 999999999);
    },
  });

  const tourHandleOpen = (val: boolean): void => {
    initSteps();
    tour.value.open = val;
  };

  function initSteps() {
    //@ts-ignore
    tour.value.steps = [
      {
        title: "恭喜创建证书流水线成功",
        description: "这里就是我们刚创建的证书任务，点击可以修改证书申请参数",
        target: () => {
          return document.querySelector(".pipeline .stages .stage_0 .task");
        },
      },
      {
        title: "添加部署证书任务",
        description: "证书申请成功之后还需要部署证书，点击这里可以添加证书部署任务",
        target: () => {
          return document.querySelector(".pipeline .stages .last-stage .tasks .task");
        },
      },
      {
        title: "手动运行流水线",
        description: "点击此处可以手动运行流水线",
        target: () => {
          return document.querySelector(".pipeline .stages .first-stage .tasks .task");
        },
      },
    ];
  }

  return {
    tour,
    tourHandleOpen,
  };
}

const { tour, tourHandleOpen } = useTour();

const userStore = useUserStore();
async function onLoaded(pipeline: PipelineDetail) {
  if (pipeline.pipeline?.userId !== userStore.getUserInfo?.id) {
    return;
  }
  const count = LocalStorage.get("pipeline-count") ?? 0;
  if (count > 1) {
    return;
  }
  const off = LocalStorage.get("tour-off") ?? false;
  if (off) {
    return;
  }
  const res = await api.GetCount();
  LocalStorage.set("pipeline-count", res.count);
  if (res.count <= 1 && editMode.value === true) {
    await nextTick();
    tourHandleOpen(true);
  }
}
</script>
<style lang="less">
.page-pipeline-detail {
}
</style>
