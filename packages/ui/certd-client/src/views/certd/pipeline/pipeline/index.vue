<template>
  <fs-page v-if="pipeline" class="page-pipeline-edit">
    <template #header>
      <div class="title">
        <pi-editable v-model="pipeline.title" :hover-show="false" :disabled="!editMode"></pi-editable>
      </div>
      <div class="more">
        <template v-if="editMode">
          <a-button type="primary" :loading="saveLoading" @click="save">保存</a-button>
          <a-button class="ml-5" @click="cancel">取消</a-button>
        </template>
        <template v-else>
          <a-button type="primary" @click="edit">编辑</a-button>
        </template>
      </div>
    </template>

    <div class="layout">
      <div class="layout-left">
        <div class="pipeline-container">
          <div class="pipeline">
            <div class="stages">
              <div class="stage first-stage">
                <div class="title">
                  <pi-editable model-value="触发源" :disabled="true" />
                </div>
                <div class="tasks">
                  <div class="task-container first-task">
                    <div class="line">
                      <div class="flow-line"></div>
                    </div>
                    <div class="task">
                      <a-button shape="round" type="primary" @click="run">
                        <fs-icon icon="ion:play"></fs-icon>
                        手动触发
                      </a-button>
                    </div>
                  </div>
                  <div v-for="(trigger, index) of pipeline.triggers" :key="trigger.id" class="task-container">
                    <div class="line">
                      <div class="flow-line"></div>
                    </div>
                    <div class="task">
                      <a-button shape="round" @click="triggerEdit(trigger, index)">
                        <fs-icon icon="ion:time"></fs-icon>
                        {{ trigger.title }}
                      </a-button>
                    </div>
                  </div>

                  <div v-if="editMode" class="task-container is-add">
                    <div class="line">
                      <div class="flow-line"></div>
                    </div>
                    <div class="task">
                      <a-button shape="round" type="dashed" @click="triggerAdd">
                        <fs-icon icon="ion:add-circle-outline"></fs-icon>
                        触发源（定时）
                      </a-button>
                    </div>
                  </div>
                </div>
              </div>

              <div v-for="(stage, index) of pipeline.stages" :key="stage.id" class="stage" :class="{ 'last-stage': !editMode && index === pipeline.stages.length - 1 }">
                <div class="title">
                  <pi-editable v-model="stage.title" :disabled="!editMode"></pi-editable>
                </div>
                <div class="tasks">
                  <div
                    v-for="(task, taskIndex) of stage.tasks"
                    :key="task.id"
                    class="task-container"
                    :class="{
                      'first-task': taskIndex === 0
                    }"
                  >
                    <div class="line">
                      <div class="flow-line"></div>
                      <fs-icon v-if="editMode" class="add-stage-btn" title="添加新阶段" icon="ion:add-circle" @click="stageAdd(index)"></fs-icon>
                    </div>
                    <div class="task">
                      <a-button shape="round" @click="taskEdit(stage, index, task, taskIndex)">
                        {{ task.title }}
                        <pi-status-show :status="task.status?.result"></pi-status-show>
                      </a-button>
                    </div>
                  </div>
                  <div v-if="editMode" class="task-container is-add">
                    <div class="line">
                      <div class="flow-line"></div>
                    </div>
                    <div class="task">
                      <a-button type="dashed" shape="round" @click="taskAdd(stage, index)">
                        <fs-icon class="font-20" icon="ion:add-circle-outline"></fs-icon>
                        并行任务
                      </a-button>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="editMode" class="stage last-stage">
                <div class="title">
                  <pi-editable model-value="新阶段" :disabled="true" />
                </div>
                <div class="tasks">
                  <div class="task-container first-task">
                    <div class="line">
                      <div class="flow-line"></div>
                      <fs-icon class="add-stage-btn" title="添加新阶段" icon="ion:add-circle" @click="stageAdd()"></fs-icon>
                    </div>
                    <div class="task">
                      <a-button shape="round" type="dashed" @click="stageAdd()">
                        <fs-icon icon="ion:add-circle-outline"></fs-icon>
                        新任务
                      </a-button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="layout-right">
        <a-page-header title="运行历史" sub-title="点任务可查看日志" class="logs-block">
          <a-timeline class="mt-10">
            <template v-for="item of histories" :key="item.id">
              <pi-history-timeline-item :runnable="item.pipeline" :is-current="currentHistory?.id === item.id" :edit-mode="editMode" @view="historyView(item)" @cancel="historyCancel()"></pi-history-timeline-item>
            </template>
            <a-empty v-if="histories.length === 0"> </a-empty>
          </a-timeline>
        </a-page-header>
      </div>
    </div>

    <pi-task-form ref="taskFormRef" :edit-mode="editMode"></pi-task-form>
    <pi-trigger-form ref="triggerFormRef" :edit-mode="editMode"></pi-trigger-form>
    <pi-task-view ref="taskViewRef"></pi-task-view>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, ref, provide, Ref, watch } from "vue";
import PiTaskForm from "./component/task-form/index.vue";
import PiTriggerForm from "./component/trigger-form/index.vue";
import PiTaskView from "./component/task-view/index.vue";
import PiStatusShow from "./component/status-show.vue";
import _ from "lodash-es";
import { message, Modal, notification } from "ant-design-vue";
import { pluginManager } from "/@/views/certd/pipeline/pipeline/plugin";
import { nanoid } from "nanoid";
import { PipelineDetail, PipelineOptions, RunHistory, Runnable } from "/@/views/certd/pipeline/pipeline/type";
import { statusUtil } from "./utils/util.status";
import PiHistoryTimelineItem from "/@/views/certd/pipeline/pipeline/component/history-timeline-item.vue";
export default defineComponent({
  name: "PipelineEdit",
  // eslint-disable-next-line vue/no-unused-components
  components: { PiHistoryTimelineItem, PiTaskForm, PiTriggerForm, PiTaskView, PiStatusShow },
  props: {
    pipelineId: {
      type: [Number, String],
      default: 0
    },
    editMode: {
      type: Boolean,
      default: false
    },
    options: {
      type: Object as PropType<PipelineOptions>,
      default() {
        return {};
      }
    }
  },
  emits: ["update:modelValue", "update:editMode"],
  setup(props, ctx) {
    const currentPipeline: Ref<any> = ref({});
    const pipeline: Ref<any> = ref({});

    const histories: Ref<RunHistory[]> = ref([]);

    const currentHistory: Ref<any> = ref({});

    const loadCurrentHistoryDetail = async () => {
      console.log("load history logs");
      const detail: RunHistory = await props.options?.getHistoryDetail({ historyId: currentHistory.value.id });
      currentHistory.value.logs = detail.logs;
      _.merge(currentHistory.value.pipeline, detail.pipeline);
    };
    const changeCurrentHistory = async (history?: RunHistory) => {
      if (!history) {
        //取消历史记录查看模式
        currentHistory.value = null;
        pipeline.value = currentPipeline.value;
        return;
      }
      currentHistory.value = history;
      pipeline.value = history.pipeline;
      await loadCurrentHistoryDetail();
      console.log("currentHistory:", currentHistory);
    };

    async function loadHistoryList(reload = false) {
      if (props.editMode) {
        return;
      }
      if (reload) {
        histories.value = [];
      }
      console.log("load history list");
      const historyList = await props.options.getHistoryList({ pipelineId: pipeline.value.id });
      if (!historyList) {
        return;
      }
      if (histories.value.length > 0 && histories.value[0].id === historyList[0].id) {
        return;
      }
      histories.value = historyList;

      if (historyList.length > 0) {
        if (historyList[0].pipeline?.version === pipeline.value.version) {
          await changeCurrentHistory(historyList[0]);
        }
      }
      return true;
    }
    const intervalLoadHistoryRef = ref();
    function watchNewHistoryList() {
      intervalLoadHistoryRef.value = setInterval(async () => {
        if (currentHistory.value == null) {
          await loadHistoryList();
        } else if (currentHistory.value.pipeline?.status?.status === "start") {
          await loadCurrentHistoryDetail();
        } else {
          clearInterval(intervalLoadHistoryRef.value);
        }
      }, 3000);
    }

    watch(
      () => {
        return props.editMode;
      },
      (editMode) => {
        if (editMode) {
          changeCurrentHistory();
        } else if (histories.value.length > 0) {
          if (histories.value[0].pipeline.version === pipeline.value.version) {
            changeCurrentHistory(histories.value[0]);
          }
        }
      }
    );
    watch(
      () => {
        return props.pipelineId;
      },
      async (value) => {
        if (!value) {
          return;
        }
        const detail: PipelineDetail = await props.options.getPipelineDetail({ pipelineId: value });
        currentPipeline.value = _.merge({ title: "新管道流程", stages: [], triggers: [] }, detail.pipeline);
        pipeline.value = currentPipeline.value;
        await loadHistoryList(true);
      },
      {
        immediate: true
      }
    );

    const plugins: Ref<any> = ref([]);

    const fetchPlugins = async () => {
      const list = await props.options.getPlugins();
      plugins.value = list;
      pluginManager.init(list);
    };
    fetchPlugins();

    provide("pipeline", pipeline);
    provide("plugins", plugins);
    provide("currentHistory", currentHistory);

    function useTask() {
      const taskFormRef: Ref<any> = ref(null);
      const currentStageIndex = ref(0);
      const currentTaskIndex = ref(0);
      provide("currentStageIndex", currentStageIndex);
      provide("currentTaskIndex", currentTaskIndex);

      function useTaskView() {
        const taskViewRef: Ref<any> = ref(null);
        const taskViewOpen = (task) => {
          taskViewRef.value.open(task);
        };
        return {
          taskViewOpen,
          taskViewRef
        };
      }

      const taskView = useTaskView();

      const taskAdd = (stage: any, stageIndex: number, onSuccess?) => {
        currentStageIndex.value = stageIndex;
        currentTaskIndex.value = stage.tasks.length;
        taskFormRef.value.taskAdd((type, value) => {
          if (type === "save") {
            stage.tasks.push(value);
            if (onSuccess) {
              onSuccess();
            }
          }
        });
      };
      const taskEdit = (stage, stageIndex, task, taskIndex, onSuccess?) => {
        currentStageIndex.value = stageIndex;
        currentTaskIndex.value = taskIndex;
        if (taskFormRef.value == null) {
          return;
        }
        if (props.editMode) {
          taskFormRef.value.taskEdit(task, (type, value) => {
            if (type === "delete") {
              stage.tasks.splice(taskIndex, 1);
              if (stage.tasks.length === 0) {
                _.remove(pipeline.value.stages, (item: Runnable) => {
                  return item.id === stage.id;
                });
              }
            } else if (type === "save") {
              stage.tasks[taskIndex] = value;
            }
            if (onSuccess) {
              onSuccess(type);
            }
          });
        } else {
          taskView.taskViewRef.value.taskViewOpen(task);
        }
      };

      return { taskAdd, taskEdit, taskFormRef, ...taskView };
    }

    function useStage(useTaskRet) {
      const stageAdd = (stageIndex = pipeline.value.stages.length) => {
        const stage = {
          id: nanoid(),
          title: "新阶段",
          tasks: [],
          status: null
        };
        //stage: any, stageIndex: number, onSuccess
        useTaskRet.taskAdd(stage, stageIndex, () => {
          let task = stage.tasks[0] as any;
          stage.title = task.title + "阶段";
          //插入阶段
          pipeline.value.stages.splice(stageIndex, 0, stage);
        });
      };
      return {
        stageAdd
      };
    }

    function useTrigger() {
      const triggerFormRef: Ref<any> = ref(null);
      const triggerAdd = () => {
        triggerFormRef.value.triggerAdd((type, value) => {
          if (type === "save") {
            pipeline.value.triggers.push(value);
          }
        });
      };
      const triggerEdit = (trigger, index) => {
        if (triggerFormRef.value == null) {
          return;
        }
        if (props.editMode) {
          triggerFormRef.value.triggerEdit(trigger, (type, value) => {
            if (type === "delete") {
              pipeline.value.triggers.splice(index, 1);
            } else if (type === "save") {
              pipeline.value.triggers[index] = value;
            }
          });
        } else {
          triggerFormRef.value.triggerView(trigger, (type, value) => {});
        }
      };
      return {
        triggerAdd,
        triggerEdit,
        triggerFormRef
      };
    }

    function useActions() {
      const saveLoading = ref();
      const run = async () => {
        if (props.editMode) {
          message.warn("请先保存，再运行管道");
          return;
        }
        if (!props.options.doTrigger) {
          message.warn("暂不支持运行");
          return;
        }
        if (pipeline.value.stages == null || pipeline.value.stages.length === 0) {
          message.warn("请先添加阶段和任务");
          return;
        }
        Modal.confirm({
          title: "确认",
          content: `确定要手动触发运行吗？`,
          async onOk() {
            //@ts-ignore
            await changeCurrentHistory(null);
            watchNewHistoryList();
            await props.options.doTrigger({ pipelineId: pipeline.value.id });
            notification.success({ message: "管道已经开始运行" });
          }
        });
      };
      function toggleEditMode(editMode: boolean) {
        ctx.emit("update:editMode", editMode);
      }
      const save = async () => {
        saveLoading.value = true;
        try {
          if (props.options.doSave) {
            pipeline.value.version++;
            currentPipeline.value = pipeline.value;
            await props.options.doSave(pipeline.value);
          }
          toggleEditMode(false);
        } finally {
          saveLoading.value = false;
        }
      };
      const edit = () => {
        pipeline.value = _.cloneDeep(currentPipeline.value);
        currentHistory.value = null;
        toggleEditMode(true);
      };
      const cancel = () => {
        pipeline.value = currentPipeline.value;
        toggleEditMode(false);
      };

      return {
        run,
        save,
        edit,
        cancel,
        saveLoading
      };
    }

    function useHistory() {
      const historyView = (history) => {
        changeCurrentHistory(history);
        console.log("currentPipeline", pipeline);
      };

      const historyCancel = () => {
        changeCurrentHistory();
        console.log("currentPipeline", pipeline);
      };

      return {
        historyView,
        historyCancel
      };
    }
    const useTaskRet = useTask();
    const useStageRet = useStage(useTaskRet);

    return {
      pipeline,
      currentHistory,
      histories,
      ...useTaskRet,
      ...useStageRet,
      ...useTrigger(),
      ...useActions(),
      ...useHistory()
    };
  }
});
</script>
<style lang="less">
.page-pipeline-edit {
  .fs-page-header {
    .title {
      .pi-editable {
        width: 300px;
      }
    }
  }

  .pi-status-show {
    display: inline-flex;
  }

  .layout {
    width: 100%;
    height: 100%;
    position: relative;
    display: flex;
    .layout-left {
      flex: 1;
      height: 100%;
    }
    .layout-right {
      width: 350px;
      height: 100%;
    }
  }
  .pipeline-container {
    width: 100%;
    height: 100%;
    position: relative;
    background-color: #f0f0f0;
    overflow: auto;
  }
  .pipeline {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    background-color: #f0f0f0;
    .stages {
      display: flex;
      overflow: auto;
      min-width: 100%;
      height: 100%;
      .stage {
        width: 300px;
        border-right: 1px solid #c7c7c7;
        .is-add {
          visibility: hidden;
          color: gray;
        }
        &:hover .is-add {
          visibility: visible;
        }

        .title {
          padding: 20px;
          color: gray;
        }
        &.first-stage {
          .line {
            width: 50% !important;
            .flow-line {
              border-left: 0;
            }
          }
        }
        &.last-stage {
          .line {
            width: 50% !important;
            left: 0;
            right: auto;
            .flow-line {
              border-right: 0;
            }
            .add-stage-btn {
              visibility: hidden;
            }
          }
        }

        .line {
          height: 50px;
          position: absolute;
          top: -25px;
          right: 0;
          width: 100%;
          .flow-line {
            height: 100%;
            margin-left: 28px;
            margin-right: 28px;
            border: 1px solid #c7c7c7;
            border-top: 0;
          }
          .add-stage-btn {
            display: inline-flex;
            visibility: hidden;
            font-size: 24px;
            cursor: pointer;
            position: absolute;
            bottom: -12px;
            left: -12px;
            z-index: 100;
            &:hover {
              color: #1890ff;
            }
          }
        }

        .tasks {
          .task-container {
            width: 100%;
            height: 50px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            position: relative;
            &.first-task {
              .line {
                .flow-line {
                  margin: 0;
                  border-left: 0;
                  border-right: 0;
                }
                .add-stage-btn {
                  visibility: visible;
                }
              }
            }
            .task {
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              height: 100%;
              z-index: 2;

              .ant-btn {
                width: 200px;
              }
            }
          }
        }
      }
    }
  }

  .logs-block {
    height: 100%;
    overflow-y: auto;
  }
}
</style>
