<template>
  <a-drawer v-model:open="taskDrawerVisible" placement="right" :closable="true" width="700px" class="pi-task-form" @after-open-change="taskDrawerOnAfterVisibleChange">
    <template #title>
      <div>
        Edit Task
        <a-button v-if="editMode" danger @click="taskDelete()">
          <template #icon><DeleteOutlined /></template>
        </a-button>
      </div>
    </template>
    <template v-if="currentTask">
      <pi-container class="task-form-container">
        <a-form ref="taskFormRef" class="task-form md:ml-20 md:mr-20" :model="currentTask" :label-col="labelCol" :wrapper-col="wrapperCol">
          <fs-form-item
            v-model="currentTask.title"
            :item="{
              title: 'Task Name',
              key: 'title',
              component: {
                name: 'a-input',
                vModel: 'value',
              },
              rules: [{ required: true, message: 'This field is required' }],
            }"
            :get-context-fn="blankFn"
          />

          <div class="steps">
            <a-form-item
              :value="currentTask.steps"
              name="steps"
              label=""
              :wrapper-col="{ span: 24 }"
              :rules="[{ required: true, message: 'At least one step is required, or you can delete this task using the delete button next to the title' }]"
            >
              <a-descriptions title="Task Steps" size="small">
                <template #extra>
                  <div class="flex gap-1">
                    <a-button type="primary" @click="stepAdd(currentTask)">Add Step</a-button>
                    <a-tooltip title="Copy all steps in this task">
                      <a-button type="default" class="isPlus" :disabled="currentTask.steps?.length === 0" @click="stepsCopy(currentTask)">Copy</a-button>
                    </a-tooltip>
                    <a-tooltip title="Paste steps copied from another task here">
                      <a-badge :count="Copyed.getCopyedCount()">
                        <a-button type="default" class="isPlus" :disabled="Copyed.getCopyedCount() === 0" @click="stepPaste(currentTask)">Paste</a-button>
                      </a-badge>
                    </a-tooltip>
                  </div>
                </template>
              </a-descriptions>
              <v-draggable v-model="currentTask.steps" class="step-list" handle=".handle" item-key="id" :disabled="!settingStore.isPlus">
                <template #item="{ element, index }">
                  <div class="step-row">
                    <div class="text">
                      <fs-icon icon="ion:flash"></fs-icon>
                      <h4 class="title" :class="{ disabled: element.disabled, deleted: element.disabled }" :title="element.title">{{ element.title }}</h4>
                    </div>
                    <div class="action">
                      <a key="edit" @click="stepEdit(currentTask, element, index)">Edit</a>
                      <a key="edit" @click="stepCopy(currentTask, element, index)">Copy</a>
                      <a key="remove" @click="stepDelete(currentTask, index)">Delete</a>
                      <a key="disabled" @click="toggleDisabled(currentTask, element)">{{ element.disabled ? "Enable" : "Disable" }}</a>
                      <fs-icon v-plus class="icon-button handle cursor-move" title="Drag to reorder" icon="ion:move-outline"></fs-icon>
                    </div>
                  </div>
                </template>
              </v-draggable>
              <div v-if="currentTask.steps?.length > 0" class="helper mt-6">Task steps run sequentially. If a previous step fails, following steps will not run.</div>
            </a-form-item>
          </div>
        </a-form>

        <pi-step-form ref="stepFormRef" :edit-mode="editMode"></pi-step-form>

        <template #footer>
          <a-form-item v-if="editMode" :wrapper-col="{ span: 14, offset: 4 }">
            <a-button type="primary" @click="taskSave"> Confirm </a-button>
          </a-form-item>
        </template>
      </pi-container>
    </template>
  </a-drawer>
</template>

<script lang="ts">
import { provide, Ref, ref } from "vue";
import { nanoid } from "nanoid";
import PiStepForm from "../step-form/index.vue";
import { message, Modal } from "ant-design-vue";
import VDraggable from "vuedraggable";
import { useUserStore } from "/@/store/user";
import { useSettingStore } from "/@/store/settings";
import { filter } from "lodash-es";
import { Copyed } from "./copy";
import { cloneDeep, merge } from "lodash-es";
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
    const userStore = useUserStore();
    const settingStore = useSettingStore();

    function useStep() {
      const stepFormRef: Ref<any> = ref(null);
      const currentStepIndex = ref(0);
      provide("currentStepIndex", currentStepIndex);
      const stepAdd = (task: any, stepDef?: any) => {
        currentStepIndex.value = task.steps.length;
        stepFormRef.value.stepAdd((type: any, value: any) => {
          if (type === "save") {
            task.steps.push(value);
            if (!task.title || task.title === "New Task") {
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
        message.success("Step configuration copied. You can paste it in another task editor.");
      };

      const stepsCopy = (task: any) => {
        settingStore.checkPlus();
        const steps = cloneDeep(task.steps);
        Copyed.type = "steps";
        Copyed.target = steps;
        message.success("All steps in this task were copied. You can paste them in another task editor.");
      };

      const stepPaste = (task: any) => {
        settingStore.checkPlus();
        if (!Copyed.target) {
          message.error("Please copy something first");
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
        message.success("Pasted successfully");
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
          title: "Confirm",
          content: `Are you sure you want to delete this step?`,
          async onOk() {
            task.steps.splice(stepIndex, 1);
          },
        });
      };

      const toggleDisabled = (task: any, step: any) => {
        step.disabled = !!!step.disabled;
      };

      return { stepAdd, stepEdit, stepCopy, stepDelete, toggleDisabled, stepFormRef, stepPaste, stepsCopy };
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
            message: "Please enter a name",
          },
        ],
      });

      const taskDrawerShow = () => {
        taskDrawerVisible.value = true;
      };
      const taskDrawerClose = () => {
        taskDrawerVisible.value = false;
      };

      const taskDrawerOnAfterVisibleChange = (val: any) => {
        console.log("taskDrawerOnAfterVisibleChange", val);
      };

      const taskOpen = (task: any, emit: any) => {
        callback.value = emit;
        currentTask.value = merge({ steps: {} }, task);
        console.log("currentTaskOpen", currentTask.value);
        taskDrawerShow();
      };

      const taskAdd = (emit: any, taskMerge: any) => {
        mode.value = "add";
        const blankTask: any = { id: nanoid(), title: "New Task", steps: [], status: null };
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
          console.error("Form validation failed:", e);
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
          title: "Confirm",
          content: `Are you sure you want to delete this task?`,
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
      settingStore,
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
