<template>
  <a-drawer
    v-model:open="taskDrawerVisible"
    placement="right"
    :closable="true"
    width="700px"
    class="pi-task-form"
    @after-open-change="taskDrawerOnAfterVisibleChange"
  >
    <template #title>
      <div>
        编辑任务
        <a-button v-if="editMode" @click="taskDelete()">
          <template #icon><DeleteOutlined /></template>
        </a-button>
      </div>
    </template>
    <template v-if="currentTask">
      <pi-container>
        <a-form ref="taskFormRef" class="task-form" :model="currentTask" :label-col="labelCol" :wrapper-col="wrapperCol">
          <fs-form-item
            v-model="currentTask.title"
            :item="{
              title: '任务名称',
              key: 'title',
              component: {
                name: 'a-input',
                vModel: 'value'
              },
              rules: [{ required: true, message: '此项必填' }]
            }"
            :get-context-fn="blankFn"
          />

          <div class="steps">
            <a-form-item
              :value="currentTask.steps"
              name="steps"
              label=""
              :wrapper-col="{ span: 24 }"
              :rules="[{ required: true, message: '至少需要一个步骤，或者你可以点击标题右边删除按钮删除此任务' }]"
            >
              <a-descriptions title="任务步骤" size="small">
                <template #extra>
                  <a-button type="primary" @click="stepAdd(currentTask)">添加步骤</a-button>
                </template>
              </a-descriptions>
              <v-draggable v-model="currentTask.steps" class="step-list" handle=".handle" item-key="id" :disabled="!userStore.isPlus">
                <template #item="{ element, index }">
                  <div class="step-row">
                    <div class="text">
                      <fs-icon icon="ion:flash"></fs-icon>
                      <h4 class="title" :class="{ disabled: element.disabled, deleted: element.disabled }">{{ element.title }}</h4>
                    </div>
                    <div class="action">
                      <a key="edit" @click="stepEdit(currentTask, element, index)">编辑</a>
                      <a key="edit" @click="stepCopy(currentTask, element, index)">复制</a>
                      <a key="remove" @click="stepDelete(currentTask, index)">删除</a>
                      <a key="disabled" @click="element.disabled = !!!element.disabled">{{ element.disabled ? "启用" : "禁用" }}</a>
                      <fs-icon v-plus class="icon-button handle cursor-move" title="拖动排序" icon="ion:move-outline"></fs-icon>
                    </div>
                  </div>
                </template>
              </v-draggable>
            </a-form-item>
          </div>
        </a-form>

        <pi-step-form ref="stepFormRef" :edit-mode="editMode"></pi-step-form>

        <template #footer>
          <a-form-item v-if="editMode" :wrapper-col="{ span: 14, offset: 4 }">
            <a-button type="primary" @click="taskSave"> 确定 </a-button>
          </a-form-item>
        </template>
      </pi-container>
    </template>
  </a-drawer>
</template>

<script lang="ts">
import { provide, Ref, ref } from "vue";
import _ from "lodash-es";
import { nanoid } from "nanoid";
import PiStepForm from "../step-form/index.vue";
import { Modal } from "ant-design-vue";
import { CopyOutlined } from "@ant-design/icons-vue";
import VDraggable from "vuedraggable";
import { useUserStore } from "/@/store/modules/user";
export default {
  name: "PiTaskForm",
  components: { CopyOutlined, PiStepForm, VDraggable },
  props: {
    editMode: {
      type: Boolean,
      default: true
    }
  },
  emits: ["update"],
  setup(props: any, ctx: any) {
    const userStore = useUserStore();
    function useStep() {
      const stepFormRef: Ref<any> = ref(null);
      const currentStepIndex = ref(0);
      provide("currentStepIndex", currentStepIndex);
      const stepAdd = (task: any, stepDef?: any) => {
        currentStepIndex.value = task.steps.length;
        stepFormRef.value.stepAdd((type: any, value: any) => {
          if (type === "save") {
            task.steps.push(value);
            if (!task.title || task.title === "新任务") {
              task.title = value.title;
            }
          }
        }, stepDef);
      };

      const stepCopy = (task: any, step: any, stepIndex: any) => {
        step = _.cloneDeep(step);
        step.id = nanoid();
        step.title = step.title + "_copy";
        stepAdd(task, step);
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
          title: "确认",
          content: `确定要删除此步骤吗？`,
          async onOk() {
            task.steps.splice(stepIndex, 1);
          }
        });
      };

      return { stepAdd, stepEdit, stepCopy, stepDelete, stepFormRef };
    }

    /**
     *  task drawer
     * @returns
     */
    function useTaskForm() {
      const mode = ref("add");
      const callback = ref();
      const currentTask = ref({ title: undefined, steps: [] });
      provide("currentTask", currentTask);
      const taskFormRef: Ref<any> = ref(null);
      const taskDrawerVisible = ref(false);
      const rules = ref({
        name: [
          {
            type: "string",
            required: true,
            message: "请输入名称"
          }
        ]
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
        currentTask.value = _.merge({ steps: {} }, task);
        console.log("currentTaskOpen", currentTask.value);
        taskDrawerShow();
      };

      const taskAdd = (emit: any, taskMerge: any) => {
        mode.value = "add";
        const blankTask: any = { id: nanoid(), title: "新任务", steps: [], status: null };
        const task: any = _.merge(blankTask, taskMerge);
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

        callback.value("save", currentTask.value);
        taskDrawerClose();
      };

      const taskDelete = () => {
        Modal.confirm({
          title: "确认",
          content: `确定要删除此任务吗？`,
          async onOk() {
            callback.value("delete");
            taskDrawerClose();
          }
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
        blankFn
      };
    }
    return {
      userStore,
      labelCol: { span: 6 },
      wrapperCol: { span: 16 },
      ...useTaskForm(),
      ...useStep()
    };
  }
};
</script>

<style lang="less">
.pi-task-form {
  .steps {
    margin: 0 50px 0 50px;
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
    padding: 10px;
    .icon-button {
      font-size: 18px;
      color: #1677ff;
      cursor: pointer;
    }

    .step-row {
      padding: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      .text {
        display: flex;
        > * {
          margin: 0px;
          margin-right: 15px;
        }
      }
      .action {
        display: flex;
        align-items: center;
        > * {
          margin-right: 15px;
          font-size: 14px;
        }
      }
    }
  }
}
</style>
