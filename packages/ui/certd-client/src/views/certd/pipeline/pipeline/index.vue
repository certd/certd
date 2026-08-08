<template>
  <fs-page v-if="pipeline" class="page-pipeline-edit">
    <template #header>
      <div class="title flex-0">
        <fs-button class="back" icon="ion:chevron-back-outline" @click="goBack"></fs-button>
        <text-editable v-model="pipeline.title" :hover-show="false" :disabled="!editMode"></text-editable>
      </div>
      <div class="more flex items-center flex-1 justify-end">
        <div v-if="isCert && pipelineDetail.lastVars?.certExpiresTime" class="flex items-center hidden md:block">
          <a-tag :color="pipelineDetail.lastVars?.certExpiresTime > Date.now() ? 'green' : 'red'">
            <span class="flex">
              <fs-icon icon="ion:time-outline"></fs-icon>
              <span v-if="pipelineDetail.lastVars?.certExpiresTime > Date.now()">
                证书过期时间：<FsTimeHumanize :model-value="pipelineDetail.lastVars?.certExpiresTime" :options="{ units: ['d'] }" format="YYYY-MM-DD"></FsTimeHumanize>
              </span>
              <span v-else> 证书已过期 <FsTimeHumanize :model-value="pipelineDetail.lastVars?.certExpiresTime" :options="{ units: ['d'] }" format="YYYY-MM-DD"></FsTimeHumanize></span>
            </span>
          </a-tag>

          <a-tag class="mr-5 pointer" color="green" type="primary" text="查看证书" @click="viewCert(pipeline.id)">
            <span class="flex"><fs-icon icon="ant-design:eye-outlined"></fs-icon> 查看证书</span>
          </a-tag>
          <a-tag class="mr-5 pointer" color="green" type="primary" text="下载证书" @click="downloadCert(pipeline.id)">
            <span class="flex"> <fs-icon icon="ant-design:download-outlined"></fs-icon> 下载证书 </span>
          </a-tag>
        </div>

        <div class="flex items-center hidden md:block">
          <a-tag v-if="nextTriggerTimes" color="blue">
            <span class="flex">
              <fs-icon icon="ion:time-outline"></fs-icon>
              下次执行时间：{{ nextTriggerTimes }}
            </span>
          </a-tag>
          <a-tag v-else-if="nextTriggerTimes === false" color="red">
            <span class="flex">
              <fs-icon icon="ion:caret-forward-circle-outline"></fs-icon>
              未设置触发源，不会自动执行
            </span>
          </a-tag>
          <a-tag v-if="pipelineDetail.validTime > 0 && settingStore.sysPublic.pipelineValidTimeEnabled && settingStore.isPlus" :color="pipelineDetail.validTime > Date.now() ? 'green' : 'red'">
            <span class="flex">
              <fs-icon icon="ion:time-outline"></fs-icon>
              <span v-if="pipelineDetail.validTime > Date.now()"> 有效期：<FsTimeHumanize :model-value="pipelineDetail.validTime" :options="{ units: ['d'] }" format="YYYY-MM-DD"></FsTimeHumanize> </span>
              <span v-else> 已过期 </span>
            </span>
          </a-tag>
        </div>
        <div v-if="hasActionPermission('write')" class="basis-40 flex justify-end mr-10">
          <template v-if="editMode">
            <fs-button type="primary" :loading="saveLoading" @click="save">保存</fs-button>
            <fs-button class="ml-5" @click="cancel">取消</fs-button>
          </template>
          <template v-else>
            <fs-button icon="ant-design:edit-outlined" type="primary" @click="edit">编辑</fs-button>
          </template>
        </div>
      </div>
    </template>

    <div class="layout">
      <div class="layout-left">
        <div ref="pipelineContainer" class="pipeline-container bg-neutral-100 dark:bg-black">
          <div class="pipeline">
            <v-draggable v-model="pipeline.stages" class="stages" item-key="id" handle=".stage-move-handle" :disabled="!settingStore.isPlus">
              <template #header>
                <div class="stage first-stage">
                  <div class="title">
                    <text-editable model-value="触发源" :disabled="true" />
                  </div>
                  <div class="tasks">
                    <div class="task-container first-task">
                      <div class="line line-right">
                        <div class="flow-line"></div>
                      </div>
                      <div class="task">
                        <a-button shape="round" type="primary" @click="run()">
                          <fs-icon icon="ion:play"></fs-icon>
                          手动触发
                        </a-button>
                      </div>
                    </div>
                    <div v-for="(trigger, index) of pipeline.triggers" :key="trigger.id" class="task-container">
                      <div class="line line-right">
                        <div class="flow-line"></div>
                      </div>
                      <div class="task">
                        <a-button shape="round" @click="triggerEdit(trigger, index)">
                          <TriggerIcon class="mr-2" :trigger-type="trigger.type"></TriggerIcon>
                          {{ trigger.title }}
                        </a-button>
                      </div>
                    </div>

                    <div v-if="editMode" class="task-container is-add">
                      <div class="line line-right">
                        <div class="flow-line"></div>
                      </div>
                      <div class="task">
                        <a-button shape="round" type="dashed" @click="triggerAdd">
                          <fs-icon icon="ion:add-circle-outline"></fs-icon>
                          触发源（定时）
                        </a-button>
                      </div>
                    </div>
                    <div v-if="editMode && !hasWebhookTrigger" class="task-container is-add">
                      <div class="line line-right">
                        <div class="flow-line"></div>
                      </div>
                      <div class="task">
                        <a-button shape="round" type="dashed" @click="triggerAdd('webhook')">
                          <fs-icon icon="ion:add-circle-outline"></fs-icon>
                          触发源（Webhook）
                        </a-button>
                      </div>
                    </div>
                  </div>
                </div>
              </template>

              <template #item="{ element: stage, index }">
                <div :key="stage.id" class="stage" :class="{ 'last-stage': isLastStage(index), ['stage_' + index]: true }">
                  <div class="title" @mousedown.stop>
                    <text-editable v-model="stage.title" :disabled="!editMode"></text-editable>
                    <div v-plus class="icon-box stage-move-handle">
                      <fs-icon v-if="editMode" title="拖动排序" icon="ion:move-outline"></fs-icon>
                    </div>
                  </div>
                  <v-draggable v-model="stage.tasks" item-key="id" class="tasks" group="task" handle=".task-move-handle" :disabled="!settingStore.isPlus" @mousedown.stop>
                    <template #item="{ element: task, index: taskIndex }">
                      <div
                        class="task-container"
                        :class="{
                          'first-task': taskIndex === 0,
                          'validate-error': hasValidateError(task.id),
                        }"
                      >
                        <div class="line line-left">
                          <div class="flow-line"></div>
                          <fs-icon v-if="editMode" class="add-stage-btn" title="添加新阶段" icon="ion:add-circle" @click="stageAdd(index)"></fs-icon>
                        </div>
                        <div class="line line-right">
                          <div class="flow-line"></div>
                        </div>
                        <div class="task">
                          <a-button shape="round" @click="taskEdit(stage, index, task, taskIndex)">
                            <a-popover title="步骤" :trigger="editMode ? 'none' : 'hover'">
                              <!--                          :open="true"-->
                              <template #content>
                                <div v-for="(item, stepIndex) of task.steps" :key="item.id" class="flex-o w-100">
                                  <span class="ellipsis flex-1 step-title" :class="{ disabled: item.disabled, deleted: item.disabled }"> {{ stepIndex + 1 }}. {{ item.title }} </span>
                                  <pi-status-show v-if="!editMode" :status="item.status?.result"></pi-status-show>
                                  <a-tooltip title="强制重新执行此步骤">
                                    <fs-icon v-if="!editMode" class="pointer color-blue ml-2" style="font-size: 16px" title="强制重新执行此步骤" icon="icon-park-outline:replay-music" @click="run(item.id)"></fs-icon>
                                  </a-tooltip>
                                </div>
                              </template>
                              <span class="flex-o w-100">
                                <span class="ellipsis flex-1 task-title" :class="{ 'in-edit': editMode, deleted: task.disabled }">{{ task.title }}</span>
                                <pi-status-show v-if="!editMode" :status="task.status?.result"></pi-status-show>
                              </span>
                            </a-popover>
                          </a-button>
                          <div class="icon-box action copy">
                            <fs-icon v-if="editMode" title="复制" icon="ion:copy-outline" @click="taskCopy(stage, index, task)"></fs-icon>
                          </div>
                          <div v-plus class="icon-box task-move-handle action drag">
                            <fs-icon v-if="editMode" title="拖动排序" icon="ion:move-outline"></fs-icon>
                          </div>
                          <div class="shortcut">
                            <TaskShortcuts :task="task" />
                          </div>
                        </div>
                      </div>
                    </template>
                    <template #footer>
                      <div v-if="editMode && !(stage.maxTaskCount > 0 && stage.tasks.length >= stage.maxTaskCount)" class="task-container is-add">
                        <div class="line line-left">
                          <div class="flow-line"></div>
                        </div>
                        <div class="line line-right">
                          <div class="flow-line"></div>
                        </div>
                        <div class="task">
                          <a-tooltip>
                            <a-button type="dashed" shape="round" @click="taskAdd(stage, index)">
                              <fs-icon class="font-20" icon="ion:add-circle-outline"></fs-icon>
                              添加任务
                            </a-button>
                          </a-tooltip>
                        </div>
                      </div>
                    </template>
                  </v-draggable>
                </div>
              </template>
              <template #footer>
                <div v-if="editMode" class="stage last-stage">
                  <div class="title">
                    <text-editable model-value="新阶段" :disabled="true" />
                  </div>
                  <div class="tasks">
                    <div class="task-container first-task">
                      <div class="line line-left">
                        <div class="flow-line"></div>
                        <fs-icon class="add-stage-btn" title="添加新阶段" icon="ion:add-circle" @click="stageAdd()"></fs-icon>
                      </div>
                      <div class="task">
                        <a-button shape="round" type="dashed" @click="stageAdd()">
                          <fs-icon icon="ion:add-circle-outline"></fs-icon>
                          添加任务
                        </a-button>
                      </div>
                    </div>
                    <div class="task-container">
                      <div class="line line-left">
                        <div class="flow-line"></div>
                      </div>
                      <div class="task">
                        <a-button shape="round" type="dashed" @click="notificationAdd()">
                          <fs-icon icon="ion:add-circle-outline"></fs-icon>
                          添加通知
                        </a-button>
                      </div>
                    </div>
                    <div v-for="(item, ii) of pipeline.notifications" :key="ii" class="task-container">
                      <div class="line line-left">
                        <div class="flow-line"></div>
                      </div>
                      <div class="task">
                        <a-button shape="round" @click="notificationEdit(item, ii as number)">
                          <div class="flex-o w-100">
                            <fs-icon icon="ion:notifications"></fs-icon>
                            <span class="ellipsis flex-1 step-title align-left"> 【通知】 {{ item.title || item.type }} </span>
                          </div>
                        </a-button>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else class="stage last-stage">
                  <div class="title">
                    <text-editable model-value="结束" :disabled="true" />
                  </div>
                  <div v-if="pipeline.notifications?.length > 0" class="tasks">
                    <div v-for="(item, index) of pipeline.notifications" :key="index" class="task-container" :class="{ 'first-task': index == 0 }">
                      <div class="line line-left">
                        <div class="flow-line"></div>
                      </div>
                      <div class="task">
                        <a-button shape="round" @click="notificationEdit(item, index)">
                          <div class="flex-o w-100">
                            <fs-icon icon="ion:notifications"></fs-icon>
                            <span class="ellipsis flex-1 step-title align-left"> 【通知】 {{ item.title || item.type }} </span>
                          </div>
                        </a-button>
                      </div>
                    </div>
                  </div>
                  <div v-else class="tasks">
                    <div class="task-container first-task">
                      <div class="line line-left">
                        <div class="flow-line"></div>
                      </div>
                      <div class="task">
                        <a-button shape="round" type="dashed">
                          <fs-icon icon="ion:notifications"></fs-icon>
                          通知未设置
                        </a-button>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </v-draggable>
          </div>
        </div>
      </div>

      <div class="layout-right transition-all duration-300" :class="{ collapsed: logsCollapse }">
        <div class="collapse-toggle bg-white dark:bg-black" @click="toggleLogsCollapse">
          <fs-icon v-if="logsCollapse" icon="ion:chevron-back-outline"></fs-icon>
          <fs-icon v-else icon="ion:chevron-forward-outline"></fs-icon>
        </div>
        <a-page-header title="运行历史" sub-title="点任务可查看日志" class="logs-block" :ghost="false">
          <a-timeline class="mt-10">
            <template v-for="item of histories" :key="item.id">
              <pi-history-timeline-item
                :runnable="item"
                :history-id="item.id"
                :is-current="currentHistory?.id === item.id"
                :edit-mode="editMode"
                @view="historyView(item)"
                @cancel="historyCancel()"
              ></pi-history-timeline-item>
            </template>
            <a-empty v-if="histories.length === 0"></a-empty>
          </a-timeline>
        </a-page-header>
      </div>
    </div>

    <pi-task-form ref="taskFormRef" :edit-mode="editMode"></pi-task-form>
    <pi-trigger-form ref="triggerFormRef" :edit-mode="editMode"></pi-trigger-form>
    <pi-task-view ref="taskViewRef" @run="run"></pi-task-view>
    <PiNotificationForm ref="notificationFormRef" :edit-mode="editMode"></PiNotificationForm>
  </fs-page>
</template>

<script lang="tsx">
import { usePreferences } from "/@/vben/preferences";
import { computed, defineComponent, onMounted, onUnmounted, provide, ref, Ref, watch } from "vue";
import { useRouter } from "vue-router";
import PiTaskForm from "./component/task-form/index.vue";
import PiTriggerForm from "./component/trigger-form/index.vue";
import PiNotificationForm from "./component/notification-form/index.vue";
import PiTaskView from "./component/task-view/index.vue";
import PiStatusShow from "./component/status-show.vue";
import VDraggable from "vuedraggable";
import { cloneDeep, merge, remove } from "lodash-es";
import { message, Modal, notification } from "ant-design-vue";
import { nanoid } from "nanoid";
import { PipelineDetail, PipelineOptions, RunHistory } from "./type";
import type { Runnable, Stage } from "@certd/pipeline";
import PiHistoryTimelineItem from "/@/views/certd/pipeline/pipeline/component/history-timeline-item.vue";
import { FsIcon } from "@fast-crud/fast-crud";
import { useSettingStore } from "/@/store/settings";
import { useUserStore } from "/@/store/user";
import TaskShortcuts from "./component/shortcut/task-shortcuts.vue";
import { eachSteps, findStep, eachStages } from "../utils";
import { usePluginStore } from "/@/store/plugin";
import { getCronNextTimes } from "/@/components/cron-editor/utils";
import { useCertViewer } from "/@/views/certd/pipeline/use";
import { useI18n } from "/@/locales";
import TriggerIcon from "./component/trigger-icon.vue";
import { useCrudPermission } from "/@/plugin/permission";
import { onBeforeRouteLeave } from "vue-router";
export default defineComponent({
  name: "PipelineEdit",
  // eslint-disable-next-line vue/no-unused-components
  components: {
    FsIcon,
    PiHistoryTimelineItem,
    PiTaskForm,
    PiTriggerForm,
    PiTaskView,
    PiStatusShow,
    PiNotificationForm,
    VDraggable,
    TaskShortcuts,
    TriggerIcon,
  },
  props: {
    pipelineId: {
      type: Number,
      default: 0,
    },
    historyId: {
      type: Number,
      default: 0,
    },
    editMode: {
      type: Boolean,
      default: false,
    },
    options: {
      type: Object as PropType<PipelineOptions>,
      default() {
        return {};
      },
    },
  },
  emits: ["update:modelValue", "update:editMode"],
  setup(props, ctx) {
    onBeforeRouteLeave((to, from) => {
      const newPipelineStr = JSON.stringify(pipeline.value || {});
      if (props.editMode && pipelineOriginStr.value && pipelineOriginStr.value !== newPipelineStr) {
        const answer = window.confirm("流水线还未保存，确定要离开吗？");
        if (!answer) {
          return false; // 返回 false 即可阻止本次路由跳转
        }
        return true;
      }
    });

    const { t } = useI18n();
    //右侧选中的pipeline
    const currentPipeline: Ref<any> = ref({});
    const pipeline: Ref<any> = ref({});
    const pipelineOriginStr = ref("");
    const pipelineDetail: Ref<any> = ref({});
    const histories: Ref<RunHistory[]> = ref([]);

    const currentHistory: Ref<any> = ref({});

    const nextTriggerTimes = computed(() => {
      const triggers = pipeline.value.triggers;
      if (!triggers || triggers.length === 0) {
        return false;
      }
      let nextTimes: any = [];
      for (const item of triggers) {
        if (!item.props?.cron) {
          continue;
        }
        const ret = getCronNextTimes(item.props?.cron, 1);
        nextTimes.push(...ret);
      }
      return nextTimes.join("，");
    });

    const router = useRouter();

    function goBack() {
      router.back();
    }

    const loadCurrentHistoryDetail = async () => {
      const detail: RunHistory = await props.options?.getHistoryDetail({ historyId: currentHistory.value.id });
      currentHistory.value.logs = detail.logs;
      currentHistory.value.pipeline = detail.pipeline;
      currentHistory.value.status = detail.pipeline.status.result;
    };
    const changeCurrentHistory = async (history?: RunHistory) => {
      if (!history) {
        //取消历史记录查看模式
        currentHistory.value = null;
        pipeline.value = cloneDeep(currentPipeline.value);
        eachStages(pipeline.value.stages, item => {
          item.status = null;
        });
        return;
      }
      currentHistory.value = history;
      await loadCurrentHistoryDetail();
      pipeline.value = currentHistory.value.pipeline;
      currentPipeline.value = currentHistory.value.pipeline;
      pipelineOriginStr.value = JSON.stringify(pipeline.value);
    };

    async function loadHistoryList(reload = false, historyId: number = null) {
      if (props.editMode) {
        return;
      }
      if (reload) {
        histories.value = [];
      }
      const historyList = await props.options.getHistoryList({ pipelineId: pipeline.value.id });
      if (!historyList) {
        return;
      }
      if (histories.value.length > 0 && histories.value[0].id === historyList[0].id) {
        return;
      }
      histories.value = historyList;

      if (historyList.length > 0) {
        if (historyId > 0) {
          //如果传递了history，优先显示历史记录作为当前
          const found = histories.value.find(item => {
            //字符串==int
            return item.id == historyId;
          });
          if (found) {
            await changeCurrentHistory(found);
            return true;
          }
        }
        //@ts-ignore
        if (historyList[0]?.version === pipeline.value?.version) {
          //如果当前的流水线版本与历史记录最后一条一致，则将该记录设置为current
          await changeCurrentHistory(historyList[0]);
        }
      }
      return true;
    }

    const intervalLoadHistoryRef = ref();
    const isLoadingHistory = ref(false);

    function watchNewHistoryList() {
      intervalLoadHistoryRef.value = setInterval(async () => {
        if (isLoadingHistory.value) {
          return;
        }
        try {
          isLoadingHistory.value = true;
          if (currentHistory.value == null) {
            await loadHistoryList();
          }

          if (currentHistory.value != null) {
            if (currentHistory.value.status === "start") {
              await loadCurrentHistoryDetail();
              pipeline.value = currentHistory.value.pipeline;
              // if (currentHistory.value.pipeline?.status?.status !== "start") {
              // 不传true好像不会刷新
              //   await loadHistoryList(true);
              // }
            }
          }
        } catch (e) {
          console.error(e);
        } finally {
          isLoadingHistory.value = false;
        }
      }, 3000);
    }

    onMounted(() => {
      watchNewHistoryList();
    });
    onUnmounted(() => {
      clearInterval(intervalLoadHistoryRef.value);
    });

    watch(
      () => {
        return props.editMode;
      },
      editMode => {
        if (editMode) {
          changeCurrentHistory();
        } else if (histories.value.length > 0) {
          if (histories.value[0].pipeline?.version === pipeline.value?.version) {
            changeCurrentHistory(histories.value[0]);
          }
        }
      }
    );
    watch(
      () => {
        return props.pipelineId;
      },
      async (value: any) => {
        if (!value) {
          return;
        }
        const detail: PipelineDetail = await props.options.getPipelineDetail({ pipelineId: value });
        pipelineDetail.value = detail;
        currentPipeline.value = merge(
          {
            title: "新管道流程",
            stages: [],
            triggers: [],
            notifications: [],
          },
          detail.pipeline
        );
        pipeline.value = currentPipeline.value;
        await loadHistoryList(true, props.historyId);
      },
      {
        immediate: true,
      }
    );

    const pluginStore = usePluginStore();
    const fetchPlugins = async () => {
      await pluginStore.init();
    };
    fetchPlugins();

    provide("pipelineDetail:get", () => pipelineDetail);
    provide("pipeline", pipeline);
    provide("getPluginGroups", () => {
      return pluginStore.group;
    });
    provide("currentHistory", currentHistory);

    function useTask() {
      const taskFormRef: Ref<any> = ref(null);
      const currentStageIndex = ref(0);
      const currentTaskIndex = ref(0);
      provide("currentStageIndex", currentStageIndex);
      provide("currentTaskIndex", currentTaskIndex);

      function useTaskView() {
        const taskViewRef: Ref<any> = ref(null);
        const taskViewOpen = (task: any) => {
          taskViewRef.value.open(task);
        };
        return {
          taskViewOpen,
          taskViewRef,
        };
      }

      const taskView = useTaskView();

      const taskAdd = (stage: any, stageIndex: number, onSuccess?: any, taskDef?: any) => {
        currentStageIndex.value = stageIndex;
        currentTaskIndex.value = stage.tasks.length;
        taskFormRef.value.taskAdd((type: any, value: any) => {
          if (type === "save") {
            stage.tasks.push(value);
            if (onSuccess) {
              onSuccess();
            }
          }
        }, taskDef);
      };

      const taskCopy = (stage: any, stageIndex: number, task: any) => {
        task = cloneDeep(task);
        task.id = nanoid();
        task.title = task.title + "_copy";
        for (const step of task.steps) {
          step.id = nanoid();
        }
        taskAdd(stage, stageIndex, null, task);
      };

      const taskEdit = (stage: any, stageIndex: number, task: any, taskIndex: number, onSuccess?: any) => {
        currentStageIndex.value = stageIndex;
        currentTaskIndex.value = taskIndex;
        if (taskFormRef.value == null) {
          return;
        }
        if (props.editMode) {
          taskFormRef.value.taskEdit(task, (type: string, value: any) => {
            if (type === "delete") {
              stage.tasks.splice(taskIndex, 1);
              if (stage.tasks.length === 0) {
                remove(pipeline.value.stages, (item: Runnable) => {
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

      return { taskAdd, taskEdit, taskCopy, taskFormRef, ...taskView };
    }

    function useStage(useTaskRet: any) {
      const stageAdd = (stageIndex = pipeline.value.stages.length) => {
        const stage: any = {
          id: nanoid(),
          title: "新阶段",
          tasks: [],
          status: null,
        };
        //stage: any, stageIndex: number, onSuccess
        useTaskRet.taskAdd(stage, stageIndex, () => {
          let task = stage.tasks[0] as any;
          stage.title = task.title + "阶段";
          //插入阶段
          pipeline.value.stages.splice(stageIndex, 0, stage);
        });
      };

      function isLastStage(index: number) {
        return false;
      }

      return {
        stageAdd,
        isLastStage,
      };
    }

    function useTrigger() {
      const triggerFormRef: Ref<any> = ref(null);
      const triggerAdd = (triggerType = "timer") => {
        triggerFormRef.value.triggerAdd(triggerType, (type: string, value: any) => {
          if (type === "save") {
            pipeline.value.triggers.push(value);
          }
        });
      };
      const triggerEdit = (trigger: any, index: number) => {
        if (triggerFormRef.value == null) {
          return;
        }
        if (props.editMode) {
          triggerFormRef.value.triggerEdit(trigger, (type: string, value: any) => {
            if (type === "delete") {
              pipeline.value.triggers.splice(index, 1);
            } else if (type === "save") {
              pipeline.value.triggers[index] = value;
            }
          });
        } else {
          triggerFormRef.value.triggerView(trigger, (type: string, value: any) => {});
        }
      };
      return {
        triggerAdd,
        triggerEdit,
        triggerFormRef,
      };
    }

    function useNotification() {
      const notificationFormRef = ref();
      const notificationAdd = () => {
        notificationFormRef.value.notificationAdd((type: string, value: any) => {
          if (type === "save") {
            if (pipeline.value.notifications == null) {
              pipeline.value.notifications = [];
            }
            pipeline.value.notifications.push(value);
          }
        });
      };
      const notificationEdit = (notification: any, index: any) => {
        if (notificationFormRef.value == null) {
          return;
        }
        if (props.editMode) {
          notificationFormRef.value.notificationEdit(notification, (type: string, value: any) => {
            if (type === "delete") {
              pipeline.value.notifications.splice(index, 1);
            } else if (type === "save") {
              pipeline.value.notifications[index] = value;
            }
          });
        } else {
          notificationFormRef.value.notificationView(notification, (type: string, value: any) => {});
        }
      };
      const notificationDelete = (notification: any, index: any) => {
        Modal.confirm({
          title: t("certd.confirm"),
          content: t("certd.confirm_delete_trigger"),
          async onOk() {
            pipeline.value.notifications.splice(index, 1);
          },
        });
      };
      return {
        notificationAdd,
        notificationEdit,
        notificationDelete,
        notificationFormRef,
      };
    }

    function useActions() {
      const saveLoading = ref();
      const run = async (stepId?: string) => {
        if (props.editMode) {
          const res = await new Promise((resolve, reject) => {
            Modal.confirm({
              title: "需要保存才能运行管道",
              content: "是否先保存",
              onOk() {
                save();
                resolve(true);
              },
              onCancel() {
                resolve(false);
              },
            });
          });
          if (!res) {
            return;
          }
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
            if (histories.value.length > 0) {
              //看是不是最新的pipeline版本
              if (pipeline.value?.version !== histories.value[0].pipeline?.version) {
                const detail: PipelineDetail = await props.options.getPipelineDetail({ pipelineId: pipeline.value.id });
                pipeline.value = detail.pipeline;
              }
            }

            await props.options.doTrigger({ pipelineId: pipeline.value.id, stepId: stepId });
            notification.success({ message: "管道已经开始运行" });
          },
        });
      };

      function toggleEditMode(editMode: boolean) {
        ctx.emit("update:editMode", editMode);
      }

      const validateErrors: Ref = ref({});

      function addValidateError(taskId: string, error: any) {
        const errors = validateErrors.value[taskId] || [];
        validateErrors.value[taskId] = errors;
        errors.push(error);
      }

      function doValidate() {
        validateErrors.value = {};

        const stepIds: string[] = [];
        //校验output id是否正确
        const pp = pipeline.value;

        //检查输出的stepid是否存在
        let hasError = false;
        let errorMessages: any = [];
        let errorIndex = 1;
        eachSteps(pp, (step: any, task: any, stage: any) => {
          if (step.disabled === true) {
            return;
          }
          stepIds.push(step.id);

          if (step.input) {
            for (const key in step.input) {
              const value = step.input[key];
              if (value == null || typeof value != "string" || !value.startsWith("step.")) {
                continue;
              }
              const arr = value.split(".");
              if (arr.length != 3) {
                continue;
              }
              const stepId = arr[1];
              const paramName = arr[2];
              if (!stepIds.includes(stepId)) {
                hasError = true;
                const message = `${step.title}的前置输出步骤${paramName}不存在或已被禁用`;
                errorIndex++;
                addValidateError(task.id, {
                  message,
                });
                addValidateError(step.id, {
                  message,
                });
                errorMessages.push(message);
              }
            }
          }
        });

        if (hasError) {
          notification.error({
            message: () => {
              const nodes = [];
              let i = 0;
              for (const error of errorMessages) {
                i++;
                nodes.push(
                  <div>
                    {i}.{error}
                  </div>
                );
              }
              return nodes;
            },
          });
          throw new Error(errorMessages?.join(","));
        }
      }

      function hasValidateError(taskId: string) {
        return validateErrors.value[taskId] != null;
      }

      const save = async (offEdit = true) => {
        doValidate();

        saveLoading.value = true;
        try {
          if (props.options.doSave) {
            currentPipeline.value = pipeline.value;

            //移除空阶段
            remove(pipeline.value.stages, (item: Stage) => {
              return item.tasks.length === 0;
            });

            const { version } = await props.options.doSave(pipeline.value);
            if (version) {
              pipeline.value.version = version;
              currentPipeline.value.version = version;
            }
            pipelineOriginStr.value = JSON.stringify(pipeline.value);
          }
          if (offEdit) {
            toggleEditMode(false);
          }
        } finally {
          saveLoading.value = false;
        }
      };

      const edit = () => {
        pipeline.value = cloneDeep(currentPipeline.value);
        currentHistory.value = null;
        toggleEditMode(true);
      };
      const cancel = () => {
        pipeline.value = cloneDeep(currentPipeline.value);
        toggleEditMode(false);
      };

      function fundStepFromPipeline(id: string) {
        return findStep(pipeline.value, id);
      }

      return {
        run,
        save,
        edit,
        cancel,
        saveLoading,
        hasValidateError,
        findStep: fundStepFromPipeline,
      };
    }

    function useHistory() {
      const historyView = (history: any) => {
        changeCurrentHistory(history);
        console.log("currentPipeline", pipeline);
      };

      const historyCancel = () => {
        // changeCurrentHistory();
        console.log("currentPipeline", pipeline);
      };

      // 获取浏览器宽度
      const viewWidth = window.innerWidth;
      const logsCollapse = ref(viewWidth < 768 ? true : false);

      function toggleLogsCollapse() {
        logsCollapse.value = !logsCollapse.value;
      }

      return {
        historyView,
        historyCancel,
        logsCollapse,
        toggleLogsCollapse,
      };
    }

    function useScroll() {
      const pipelineContainer = ref();
      onMounted(() => {
        if (pipelineContainer.value) {
          const scrollableDiv = pipelineContainer.value;
          let isDragging = false;
          let startX: any = null;
          let scrollLeft: any = null;

          scrollableDiv.addEventListener("mousedown", (e: any) => {
            isDragging = true;
            startX = e.pageX - scrollableDiv.offsetLeft;
            scrollLeft = scrollableDiv.scrollLeft;
            scrollableDiv.style.cursor = "grabbing"; // 按住时变成抓手
            e.stopPropagation();
          });

          scrollableDiv.addEventListener("mouseleave", () => {
            isDragging = false;
            scrollableDiv.style.cursor = "grab"; // 离开时恢复光标
          });

          scrollableDiv.addEventListener("mouseup", () => {
            isDragging = false;
            scrollableDiv.style.cursor = "grab"; // 松开时恢复光标
          });

          scrollableDiv.addEventListener("mousemove", (e: any) => {
            if (!isDragging) return; // 如果没有按住鼠标，退出
            e.preventDefault();
            const x = e.pageX - scrollableDiv.offsetLeft;
            const walk = (x - startX) * 2; // 移动的速度
            scrollableDiv.scrollLeft = scrollLeft - walk; // 更新滚动位置
          });
        }
      });

      return { pipelineContainer };
    }

    const useTaskRet = useTask();
    const useStageRet = useStage(useTaskRet);
    const settingStore = useSettingStore();
    const userStore = useUserStore();

    const actions = useActions();
    const trigger = useTrigger();
    provide("getPipelineScope", () => {
      return {
        run: actions.run,
        pipeline: pipeline,
        save: actions.save,
        findStep: actions.findStep,
      };
    });

    const { viewCert, downloadCert } = useCertViewer();
    const isCert = computed(() => {
      return currentPipeline.value?.type?.startsWith("cert") || pipelineDetail.value.lastVars?.certExpiresTime;
    });

    const hasWebhookTrigger = computed(() => {
      return currentPipeline.value?.triggers?.some((item: any) => item.type === "webhook");
    });

    const { hasActionPermission } = useCrudPermission({ permission: { isProjectPermission: true } });
    return {
      isCert,
      pipeline,
      currentHistory,
      histories,
      goBack,
      hasActionPermission,
      userStore,
      settingStore,
      ...useTaskRet,
      ...useStageRet,
      ...trigger,
      ...actions,
      ...useHistory(),
      ...useNotification(),
      ...useScroll(),
      nextTriggerTimes,
      viewCert,
      downloadCert,
      pipelineDetail,
      hasWebhookTrigger,
    };
  },
});
</script>
<style lang="less">
.page-pipeline-edit {
  .fs-page-header {
    .title {
      overflow: hidden;
      text-overflow: ellipsis;
      text-wrap: nowrap;
      display: flex;

      .back {
        margin-right: 10px;
      }

      .text-editable {
        width: 300px;
      }
    }
  }

  .pi-status-show {
    display: inline-flex;
  }

  .fs-page-content {
    overflow-x: auto;
  }

  .layout {
    width: 100%;
    height: 100%;
    position: relative;
    display: flex;
    overflow-x: hidden;

    .layout-left {
      flex: 1;
      height: 100%;
    }

    .layout-right {
      width: 368px;
      height: 100%;
      max-width: 90vw;
    }
  }

  .pipeline-container {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: auto;
  }

  .pipeline {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;

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
          display: flex;

          .stage-move-handle {
            cursor: move;
            margin-left: 4px;
          }
        }

        //.sortable-ghost {
        //  .line {
        //    visibility: hidden;
        //  }
        //}
        .line {
          height: 50px;
          position: absolute;
          top: -25px;
          width: 25px;

          &.line-left {
            left: 25px;

            .flow-line {
              border-right: 0;
            }
          }

          &.line-right {
            right: 25px;

            .flow-line {
              border-left: 0;
            }
          }

          .flow-line {
            height: 100%;
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

        .task-container:first-child {
          .line {
            width: 50px;

            &.line-left {
              left: 0;

              .flow-line {
                border-right: 0;
                border-left: 0;
              }
            }

            &.line-right {
              right: 0;

              .flow-line {
                border-left: 0;
                border-right: 0;
              }
            }

            .add-stage-btn {
              visibility: visible;
            }
          }
        }

        &.first-stage {
          .line {
            .flow-line {
              border-left: 0;
            }
          }
        }

        &.last-stage {
          .line {
            width: 50% !important;
            right: auto;

            .flow-line {
              border-right: 0;
            }

            .add-stage-btn {
              visibility: hidden;
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

            &.validate-error {
              .task {
                .ant-btn {
                  border-color: red;
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

              .task-title {
                &.in-edit {
                  margin-right: 28px;
                }

                &.disabled {
                }
              }

              .action {
                position: absolute;
                right: 10px;
                top: 17px;
                //font-size: 18px;
                cursor: pointer;
                z-index: 10;

                &:hover {
                  color: #1890ff;
                }

                &.copy {
                  right: 30px;
                }

                &.drag {
                  right: 10px;
                  cursor: move;
                }
              }

              .ant-btn {
                width: 200px;
              }

              position: relative;

              .shortcut {
                position: absolute;
                bottom: -10px;
                left: 20px;
              }
            }
          }
        }
      }
    }
  }

  .layout-right {
    position: relative;
    &.collapsed {
      margin-right: max(-368px, -90vw);
    }

    .collapse-toggle {
      position: absolute;
      margin-left: -30px;
      top: 10px;
      cursor: pointer;
      font-size: 20px;
      color: #1890ff;
      width: 30px;
      height: 30px;
      border: 1px solid #eee;
      border-right: 0;
      border-radius: 5px 0 0 5px;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .logs-block {
      height: 100%;
      overflow-y: auto;
      max-width: 90vw;

      .ant-page-header-content {
        position: relative;
      }
    }
  }
}
</style>
