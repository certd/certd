<template>
  <a-drawer
    v-model:visible="taskDrawerVisible"
    placement="right"
    :closable="true"
    width="600px"
    class="pi-task-form"
    :after-visible-change="taskDrawerOnAfterVisibleChange"
  >
    <template #title>
      编辑任务
      <a-button v-if="editMode" @click="taskDelete()">
        <template #icon><DeleteOutlined /></template>
      </a-button>
    </template>
    <template v-if="currentTask">
      <pi-container>
        <a-form
          ref="taskFormRef"
          class="task-form"
          :model="currentTask"
          :label-col="labelCol"
          :wrapper-col="wrapperCol"
        >
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
              <a-list class="step-list" item-layout="horizontal" :data-source="currentTask.steps">
                <template #renderItem="{ item, index }">
                  <a-list-item>
                    <template #actions>
                      <a key="edit" @click="stepEdit(currentTask, item, index)">编辑</a>
                      <a key="remove" @click="stepDelete(currentTask, index)">删除</a>
                    </template>
                    <a-list-item-meta>
                      <template #title>
                        {{ item.title }}
                      </template>
                      <template #avatar>
                        <fs-icon icon="ion:flash"></fs-icon>
                      </template>
                    </a-list-item-meta>
                  </a-list-item>
                </template>
              </a-list>
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
import { message, Modal } from "ant-design-vue";

export default {
  name: "PiTaskForm",
  components: { PiStepForm },
  props: {
    editMode: {
      type: Boolean,
      default: true
    }
  },
  emits: ["update"],
  setup(props, ctx) {
    function useStep() {
      const stepFormRef: Ref<any> = ref(null);
      const currentStepIndex = ref(0);
      provide("currentStepIndex", currentStepIndex);
      const stepAdd = (task) => {
        currentStepIndex.value = task.steps.length;
        stepFormRef.value.stepAdd((type, value) => {
          if (type === "save") {
            task.steps.push(value);
            if (!task.title || task.title === "新任务") {
              task.title = value.title;
            }
          }
        });
      };
      const stepEdit = (task, step, stepIndex) => {
        currentStepIndex.value = stepIndex;
        console.log("step.edit start", task, step, props.editMode);
        if (props.editMode) {
          console.log("step.edit", task, step);
          stepFormRef.value.stepEdit(step, (type, value) => {
            console.log("step.save", step, type, value);
            if (type === "delete") {
              task.steps.splice(stepIndex, 1);
            } else if (type === "save") {
              task.steps[stepIndex] = { ...value };
            }
            console.log("task.steps", task.steps);
          });
        } else {
          stepFormRef.value.stepView(step, (type, value) => {});
        }
      };

      const stepDelete = (task, stepIndex) => {
        Modal.confirm({
          title: "确认",
          content: `确定要删除此步骤吗？`,
          async onOk() {
            task.steps.splice(stepIndex, 1);
          }
        });
      };

      return { stepAdd, stepEdit, stepDelete, stepFormRef };
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

      const taskDrawerOnAfterVisibleChange = (val) => {
        console.log("taskDrawerOnAfterVisibleChange", val);
      };

      const taskOpen = (task, emit) => {
        callback.value = emit;
        currentTask.value = _.merge({ steps: {} }, task);
        console.log("currentTaskOpen", currentTask.value);
        taskDrawerShow();
      };

      const taskAdd = (emit) => {
        mode.value = "add";
        const task = { id: nanoid(), title: "新任务", steps: [], status: null };
        taskOpen(task, emit);
      };

      const taskEdit = (task, emit) => {
        mode.value = "edit";
        taskOpen(task, emit);
      };

      const taskView = (task, emit) => {
        mode.value = "view";
        taskOpen(task, emit);
      };

      const taskSave = async (e) => {
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
}
</style>
