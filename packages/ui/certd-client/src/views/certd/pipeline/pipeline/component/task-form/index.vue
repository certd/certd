<template>
  <a-drawer v-model:open="taskDrawerVisible" placement="right" :closable="true" width="700px" class="pi-task-form" @after-open-change="taskDrawerOnAfterVisibleChange">
    <template #title>
      <div>
        {{ t("certd.pipeline.editor.editTask") }}
        <a-button v-if="editMode" danger @click="taskDelete()">
          <template #icon><DeleteOutlined /></template>
        </a-button>
      </div>
    </template>
    <template #extra>
      <fs-button
        v-if="!settingStore.isComm"
        shape="circle"
        type="text"
        icon="clarity:host-solid-badged"
        :text="null"
        :tooltip="{ title: 'Certd无法访问主机？试试主动拉取证书的客户端CertdClient吧' }"
        @click="goCertdClient"
      />
    </template>
    <template v-if="currentTask">
      <pi-container class="task-form-container">
        <a-form ref="taskFormRef" class="task-form md:ml-20 md:mr-20" :model="currentTask" :label-col="labelCol" :wrapper-col="wrapperCol">
          <fs-form-item
            v-model="currentTask.title"
            :item="{
              title: t('certd.pipeline.editor.taskName'),
              key: 'title',
              component: {
                name: 'a-input',
                vModel: 'value',
              },
              rules: [{ required: true, message: t('certd.pipeline.editor.required') }],
            }"
            :get-context-fn="blankFn"
          />

          <div class="steps">
            <a-form-item :value="currentTask.steps" name="steps" label="" :wrapper-col="{ span: 24 }" :rules="[{ required: true, message: t('certd.pipeline.editor.taskNeedsStep') }]">
              <a-descriptions :title="t('certd.pipeline.editor.taskSteps')" size="small">
                <template #extra>
                  <div class="flex gap-1">
                    <a-button type="primary" @click="stepAdd(currentTask)">{{ t("certd.pipeline.editor.addStep") }}</a-button>
                    <a-tooltip :title="t('certd.pipeline.editor.allStepsCopied')">
                      <a-button type="default" class="isPlus" :disabled="currentTask.steps?.length === 0" @click="stepsCopy(currentTask)">{{ t("certd.pipeline.editor.copy") }}</a-button>
                    </a-tooltip>
                    <a-tooltip :title="t('certd.pipeline.editor.paste')">
                      <a-badge :count="Copyed.getCopyedCount()">
                        <a-button type="default" class="isPlus" :disabled="Copyed.getCopyedCount() === 0" @click="stepPaste(currentTask)">{{ t("certd.pipeline.editor.paste") }}</a-button>
                      </a-badge>
                    </a-tooltip>
                  </div>
                </template>
              </a-descriptions>
              <v-draggable v-model="currentTask.steps" class="step-list" handle=".handle" item-key="id" :disabled="!settingStore.isPlus">
                <template #item="{ element, index }">
                  <div class="step-row">
                    <div class="text">
                      <a-checkbox
                        v-if="editMode && stepBatchEditing"
                        :aria-label="`选择步骤${element.title}`"
                        :checked="isStepSelected(element.id)"
                        @click.stop
                        @change="toggleStepSelection(element.id, $event.target.checked)"
                      />
                      <fs-icon icon="ion:flash"></fs-icon>
                      <h4 class="title" :class="{ disabled: element.disabled, deleted: element.disabled }" :title="element.title">{{ element.title }}</h4>
                    </div>
                    <div class="action">
                      <a key="edit" @click="stepEdit(currentTask, element, index)">{{ t("certd.pipeline.actions.edit") }}</a>
                      <a key="edit" @click="stepCopy(currentTask, element, index)">{{ t("certd.pipeline.editor.copy") }}</a>
                      <a key="remove" @click="stepDelete(currentTask, index)">{{ t("certd.pipeline.actions.delete") }}</a>
                      <a key="disabled" @click="toggleDisabled(currentTask, element)">{{ element.disabled ? t("certd.pipeline.actions.enable") : t("certd.pipeline.actions.disable") }}</a>
                      <fs-icon v-plus class="icon-button handle cursor-move" :title="t('certd.pipeline.editor.dragSort')" icon="ion:move-outline"></fs-icon>
                    </div>
                  </div>
                </template>
              </v-draggable>
              <div v-if="editMode && currentTask.steps?.length > 0" class="step-batch-actions">
                <a-tooltip v-if="!stepBatchEditing" :title="t('certd.pipeline.editor.batchEditSteps')">
                  <a-button type="text" size="small" class="need-plus" @click="setStepBatchEditing(true)">
                    <fs-icon icon="tdesign:ai-edit-1"></fs-icon>
                  </a-button>
                </a-tooltip>
                <template v-else>
                  <a-tooltip :title="t('certd.pipeline.editor.selectAllSteps')">
                    <a-checkbox
                      :aria-label="`全选${currentTask.title}中的步骤`"
                      :checked="isAllStepsSelected(currentTask)"
                      :indeterminate="isStepsSelectionIndeterminate(currentTask)"
                      @change="toggleAllSteps(currentTask, $event.target.checked)"
                    />
                  </a-tooltip>
                  <!-- <a-tag v-if="selectedStepCount > 0" color="blue">{{ selectedStepCount }}</a-tag> -->
                  <a-tooltip :title="t('certd.pipeline.editor.batchEnableSteps')">
                    <a-button type="text" size="small" :disabled="selectedStepCount === 0" @click="batchEnableSteps(currentTask)">
                      <fs-icon :class="{ 'text-green-600': selectedStepCount !== 0 }" icon="ion:power-outline"></fs-icon>
                    </a-button>
                  </a-tooltip>
                  <a-tooltip :title="t('certd.pipeline.editor.batchDisableSteps')">
                    <a-button type="text" size="small" :disabled="selectedStepCount === 0" @click="batchDisableSteps(currentTask)">
                      <fs-icon icon="ion:stop-circle-outline"></fs-icon>
                    </a-button>
                  </a-tooltip>
                  <a-tooltip :title="t('certd.pipeline.editor.batchDeleteSteps')">
                    <a-button danger type="text" size="small" :disabled="selectedStepCount === 0" @click="batchDeleteSteps(currentTask)">
                      <fs-icon icon="ion:trash-outline"></fs-icon>
                    </a-button>
                  </a-tooltip>
                  <a-tooltip :title="t('certd.pipeline.editor.exitBatchEdit')">
                    <a-button type="text" size="small" @click="setStepBatchEditing(false)">
                      <fs-icon icon="ion:close-outline"></fs-icon>
                    </a-button>
                  </a-tooltip>
                </template>
              </div>
              <div v-if="currentTask.steps?.length > 0" class="helper mt-6">{{ t("certd.pipeline.editor.stepsSerialHelper") }}</div>
            </a-form-item>
          </div>
        </a-form>

        <pi-step-form ref="stepFormRef" :edit-mode="editMode"></pi-step-form>

        <template #footer>
          <a-form-item v-if="editMode" :wrapper-col="{ span: 14, offset: 4 }">
            <a-button type="primary" @click="taskSave"> {{ t("certd.pipeline.editor.confirm") }} </a-button>
          </a-form-item>
        </template>
      </pi-container>
    </template>
  </a-drawer>
</template>

<script lang="ts">
import { computed, provide, Ref, ref } from "vue";
import { nanoid } from "nanoid";
import PiStepForm from "../step-form/index.vue";
import { notification, Modal } from "ant-design-vue";
import VDraggable from "vuedraggable";
import { useUserStore } from "/@/store/user";
import { useSettingStore } from "/@/store/settings";
import { filter } from "lodash-es";
import { Copyed } from "./copy";
import { cloneDeep, merge } from "lodash-es";
import { disableSteps, enableSteps, removeSelectedItems } from "../batch-actions";
import { settings } from "nprogress";
import { useI18n } from "/@/locales";
export default {
  name: "PiTaskForm",
  components: { PiStepForm, VDraggable },
  props: {
    editMode: {
      type: Boolean,
      default: true,
    },
  },
  emits: ["update"],
  setup(props: any, ctx: any) {
    const { t } = useI18n();
    const userStore = useUserStore();
    const settingStore = useSettingStore();
    const selectedStepIds = ref<string[]>([]);
    const stepBatchEditing = ref(false);

    function goCertdClient() {
      window.open("https://github.com/certd/certd-client");
    }

    function useStep() {
      const stepFormRef: Ref<any> = ref(null);
      const currentStepIndex = ref(0);
      provide("currentStepIndex", currentStepIndex);

      const selectedStepCount = computed(() => selectedStepIds.value.length);

      const isStepSelected = (stepId: string) => {
        return selectedStepIds.value.includes(stepId);
      };

      const toggleStepSelection = (stepId: string, selected: boolean) => {
        const stepIds = new Set(selectedStepIds.value);
        if (selected) {
          stepIds.add(stepId);
        } else {
          stepIds.delete(stepId);
        }
        selectedStepIds.value = [...stepIds];
      };

      const isAllStepsSelected = (task: any) => {
        return task.steps.length > 0 && selectedStepCount.value === task.steps.length;
      };

      const isStepsSelectionIndeterminate = (task: any) => {
        return selectedStepCount.value > 0 && selectedStepCount.value < task.steps.length;
      };

      const toggleAllSteps = (task: any, selected: boolean) => {
        selectedStepIds.value = selected ? task.steps.map((step: any) => step.id) : [];
      };

      const setStepBatchEditing = (enabled: boolean) => {
        if (enabled) {
          // 批量编辑步骤为专业版功能，非专业版用户点击后弹出升级提示并中断
          settingStore.checkPlus();
        }
        stepBatchEditing.value = enabled;
        if (!enabled) {
          selectedStepIds.value = [];
        }
      };

      const batchEnableSteps = (task: any) => {
        task.steps = enableSteps(task.steps, new Set(selectedStepIds.value));
        selectedStepIds.value = [];
      };

      const batchDisableSteps = (task: any) => {
        task.steps = disableSteps(task.steps, new Set(selectedStepIds.value));
        selectedStepIds.value = [];
      };

      const batchDeleteSteps = (task: any) => {
        const selectedCount = selectedStepCount.value;
        if (selectedCount === 0) {
          return;
        }

        Modal.confirm({
          title: t("certd.pipeline.editor.confirmTitle"),
          content: t("certd.pipeline.editor.confirmDeleteSelectedSteps", { count: selectedCount }),
          onOk() {
            task.steps = removeSelectedItems(task.steps, new Set(selectedStepIds.value));
            selectedStepIds.value = [];
          },
        });
      };
      const stepAdd = (task: any, stepDef?: any) => {
        currentStepIndex.value = task.steps.length;
        stepFormRef.value.stepAdd((type: any, value: any) => {
          if (type === "save") {
            task.steps.push(value);
            if (!task.title || task.title === t("certd.pipeline.editor.newTask")) {
              task.title = value.title;
            }
          }
        }, stepDef);
      };

      const stepCopy = (task: any, step: any, stepIndex: any) => {
        settingStore.checkPlus();
        step = cloneDeep(step);
        step.id = nanoid();
        Copyed.type = "step";
        Copyed.target = step;
        notification.success({ message: t("certd.pipeline.editor.stepCopied") });
      };

      const stepsCopy = (task: any) => {
        settingStore.checkPlus();
        const steps = cloneDeep(task.steps);
        Copyed.type = "steps";
        Copyed.target = steps;
        notification.success({ message: t("certd.pipeline.editor.allStepsCopied") });
      };

      const stepPaste = (task: any) => {
        settingStore.checkPlus();
        if (!Copyed.target) {
          notification.error({ message: t("certd.pipeline.editor.copyFirst") });
          return;
        }
        if (Copyed.type === "step") {
          const step = cloneDeep(Copyed.target);
          step.id = nanoid();
          step.title = step.title + "_copy";
          task.steps.push(step);
        } else if (Copyed.type === "steps") {
          const steps = cloneDeep(Copyed.target);
          for (const item of steps) {
            item.id = nanoid();
            item.title = item.title + "_copy";
            task.steps.push(item);
          }
        }
        notification.success({ message: t("certd.pipeline.editor.pasted") });
      };
      const stepEdit = (task: any, step: any, stepIndex: any) => {
        currentStepIndex.value = stepIndex;
        console.log("step.edit start", task, step, props.editMode);
        if (props.editMode) {
          console.log("step.edit", task, step);
          stepFormRef.value.stepEdit(step, (type: any, value: any) => {
            console.log("step.save", step, type, value);
            if (type === "delete") {
              task.steps.splice(stepIndex, 1);
              selectedStepIds.value = selectedStepIds.value.filter(stepId => task.steps.some((item: any) => item.id === stepId));
            } else if (type === "save") {
              task.steps[stepIndex] = { ...value };
            }
            console.log("task.steps", task.steps);
          });
        } else {
          stepFormRef.value.stepView(step, (type: any, value: any) => {});
        }
      };

      const stepDelete = (task: any, stepIndex: any) => {
        Modal.confirm({
          title: t("certd.pipeline.editor.confirmTitle"),
          content: t("certd.pipeline.editor.confirmDeleteStep"),
          async onOk() {
            task.steps.splice(stepIndex, 1);
            selectedStepIds.value = selectedStepIds.value.filter(stepId => task.steps.some((step: any) => step.id === stepId));
          },
        });
      };

      const toggleDisabled = (task: any, step: any) => {
        step.disabled = !!!step.disabled;
      };

      return {
        stepAdd,
        stepEdit,
        stepCopy,
        stepDelete,
        toggleDisabled,
        stepFormRef,
        stepPaste,
        stepsCopy,
        selectedStepCount,
        isStepSelected,
        toggleStepSelection,
        isAllStepsSelected,
        isStepsSelectionIndeterminate,
        toggleAllSteps,
        stepBatchEditing,
        setStepBatchEditing,
        batchEnableSteps,
        batchDisableSteps,
        batchDeleteSteps,
      };
    }

    /**
     *  task drawer
     * @returns
     */
    function useTaskForm() {
      const mode = ref("add");
      const callback = ref();
      const currentTask = ref({ title: undefined, steps: [], disabled: false });
      provide("currentTask", currentTask);
      const taskFormRef: Ref<any> = ref(null);
      const taskDrawerVisible = ref(false);
      const rules = ref({
        name: [
          {
            type: "string",
            required: true,
            message: t("certd.pipeline.editor.enterName"),
          },
        ],
      });

      const taskDrawerShow = () => {
        taskDrawerVisible.value = true;
      };
      const taskDrawerClose = () => {
        taskDrawerVisible.value = false;
        stepBatchEditing.value = false;
        selectedStepIds.value = [];
      };

      const taskDrawerOnAfterVisibleChange = (val: any) => {
        console.log("taskDrawerOnAfterVisibleChange", val);
      };

      const taskOpen = (task: any, emit: any) => {
        callback.value = emit;
        selectedStepIds.value = [];
        stepBatchEditing.value = false;
        currentTask.value = merge({ steps: {} }, task);
        console.log("currentTaskOpen", currentTask.value);
        taskDrawerShow();
      };

      const taskAdd = (emit: any, taskMerge: any) => {
        mode.value = "add";
        const blankTask: any = { id: nanoid(), title: t("certd.pipeline.editor.newTask"), steps: [], status: null };
        const task: any = merge(blankTask, taskMerge);
        taskOpen(task, emit);
      };

      const taskEdit = (task: any, emit: any) => {
        mode.value = "edit";
        taskOpen(task, emit);
      };

      const taskView = (task: any, emit: any) => {
        mode.value = "view";
        taskOpen(task, emit);
      };

      const taskSave = async (e: any) => {
        console.log("currentTaskSave", currentTask.value);
        try {
          await taskFormRef.value.validate();
        } catch (e) {
          console.error("表单验证失败:", e);
          return;
        }
        const task: any = currentTask.value;
        const allDisabled = filter(task.steps, (item: any) => {
          return item.disabled;
        });
        if (task.steps.length > 0 && task.steps.length === allDisabled.length) {
          task.disabled = true;
        } else {
          task.disabled = false;
        }

        callback.value("save", currentTask.value);
        taskDrawerClose();
      };

      const taskDelete = () => {
        Modal.confirm({
          title: t("certd.pipeline.editor.confirmTitle"),
          content: t("certd.pipeline.editor.confirmDeleteTask"),
          async onOk() {
            callback.value("delete");
            taskDrawerClose();
          },
        });
      };

      const blankFn = () => {
        return {};
      };
      return {
        taskFormRef,
        mode,
        taskAdd,
        taskEdit,
        taskView,
        taskDrawerShow,
        taskDrawerVisible,
        taskDrawerOnAfterVisibleChange,
        currentTask,
        taskSave,
        taskDelete,
        rules,
        blankFn,
      };
    }
    return {
      userStore,
      t,
      settingStore,
      goCertdClient,
      labelCol: { span: 4 },
      wrapperCol: { span: 20 },
      ...useTaskForm(),
      ...useStep(),
      Copyed,
    };
  },
};
</script>

<style lang="less">
.pi-task-form {
  .task-form-container {
    .body {
      .task-form {
        .ant-form-item-label {
          text-align: left !important ;
        }
      }
    }
  }

  .steps {
    margin: 0;

    .step-batch-actions {
      min-height: 32px;
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 8px 0 10px;

      .ant-tag {
        margin: 0;
      }
    }
  }
  .ant-list .ant-list-item .ant-list-item-meta .ant-list-item-meta-title {
    margin: 0;
  }
  .ant-list .ant-list-item .ant-list-item-action {
    display: flex;
    > li {
      display: flex;
      align-items: center;
    }
  }
  .step-list {
    .icon-button {
      font-size: 18px;
      color: #1677ff;
      cursor: pointer;
    }

    .step-row {
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      .text {
        display: flex;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        > * {
          margin: 0px;
          margin-right: 15px;
        }

        .fs-icon {
        }
      }
      .action {
        display: flex;
        align-items: center;
        flex-wrap: nowrap;
        word-wrap: nowrap;
        margin-left: 10px;
        > * {
          margin-right: 10px;
          font-size: 14px;
          display: flex;
          align-items: center;
          flex-wrap: nowrap;
          white-space: nowrap;
        }
      }
    }
  }
}
</style>
