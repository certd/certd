<template>
  <a-drawer v-model:visible="stepDrawerVisible" placement="right" :closable="true" width="600px" :after-visible-change="stepDrawerOnAfterVisibleChange">
    <template #title>
      编辑任务
      <a-button v-if="editMode" @click="stepDelete()">
        <template #icon><DeleteOutlined /></template>
      </a-button>
    </template>
    <template v-if="currentStep">
      <pi-container v-if="currentStep._isAdd" class="pi-step-form">
        <a-row :gutter="10">
          <a-col v-for="(item, index) of stepPluginDefineList" :key="index" class="step-plugin" :span="12">
            <a-card
              hoverable
              :class="{ current: item.name === currentStep.type }"
              @click="stepTypeSelected(item)"
              @dblclick="
                stepTypeSelected(item);
                stepTypeSave();
              "
            >
              <a-card-meta>
                <template #title>
                  <a-avatar :src="item.icon || '/images/plugin.png'" />
                  <span class="title">{{ item.title }}</span>
                </template>
                <template #description>
                  <span :title="item.desc">{{ item.desc }}</span>
                </template>
              </a-card-meta>
            </a-card>
          </a-col>
        </a-row>
        <a-button v-if="editMode" type="primary" @click="stepTypeSave"> 确定 </a-button>
      </pi-container>
      <pi-container v-else class="pi-step-form">
        <a-form ref="stepFormRef" class="step-form" :model="currentStep" :label-col="labelCol" :wrapper-col="wrapperCol">
          <div class="mb-10">
            <a-alert type="info" :message="currentPlugin.title" :description="currentPlugin.desc"> </a-alert>
          </div>
          <fs-form-item
            v-model="currentStep.title"
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
          <template v-for="(item, key) in currentPlugin.input" :key="key">
            <fs-form-item v-model="currentStep.input[key]" :item="item" :get-context-fn="blankFn" />
          </template>

          <fs-form-item
            v-model="currentStep.strategy.runStrategy"
            :item="{
              title: '运行策略',
              key: 'strategy.runStrategy',
              component: {
                name: 'a-select',
                vModel: 'value',
                options: [
                  { value: 0, label: '正常运行' },
                  { value: 1, label: '成功后跳过' }
                ]
              },
              rules: [{ required: true, message: '此项必填' }]
            }"
            :get-context-fn="blankFn"
          />
        </a-form>

        <template #footer>
          <a-form-item v-if="editMode" :wrapper-col="{ span: 14, offset: 4 }">
            <a-button type="primary" @click="stepSave"> 确定 </a-button>
          </a-form-item>
        </template>
      </pi-container>
    </template>
  </a-drawer>
</template>

<script lang="jsx">
import { message, Modal } from "ant-design-vue";
import { inject, ref } from "vue";
import _ from "lodash-es";
import { nanoid } from "nanoid";
export default {
  name: "PiStepForm",
  props: {
    editMode: {
      type: Boolean,
      default: true
    }
  },
  emits: ["update"],
  setup(props, context) {
    /**
     *  step drawer
     * @returns
     */
    function useStepForm() {
      const stepPluginDefineList = inject("plugins");

      const mode = ref("add");
      const callback = ref();
      const currentStep = ref({ title: undefined, input: {} });
      const currentPlugin = ref({});
      const stepFormRef = ref(null);
      const stepDrawerVisible = ref(false);
      const rules = ref({
        name: [
          {
            type: "string",
            required: true,
            message: "请输入名称"
          }
        ]
      });

      const stepTypeSelected = (item) => {
        currentStep.value.type = item.name;
        currentStep.value.title = item.title;
        console.log("currentStepTypeChanged:", currentStep.value);
      };

      const stepTypeSave = () => {
        currentStep.value._isAdd = false;
        if (currentStep.value.type == null) {
          message.warn("请先选择类型");
          return;
        }
        // 给step的input设置默认值
        changeCurrentPlugin(currentStep.value);

        //赋初始值
        _.merge(currentStep.value, { input: {}, strategy: { runStrategy: 0 } }, currentPlugin.value.default, currentStep.value);

        for (const key in currentPlugin.value.input) {
          const input = currentPlugin.value.input[key];
          if (input.default != null) {
            currentStep.value.input[key] = input.default ?? input.value;
          }
        }
      };

      const stepDrawerShow = () => {
        stepDrawerVisible.value = true;
      };
      const stepDrawerClose = () => {
        stepDrawerVisible.value = false;
      };

      const stepDrawerOnAfterVisibleChange = (val) => {
        console.log("stepDrawerOnAfterVisibleChange", val);
      };

      const stepOpen = (step, emit) => {
        callback.value = emit;
        currentStep.value = _.merge({ input: {}, strategy: {} }, step);
        console.log("currentStepOpen", currentStep.value);
        if (step.type) {
          changeCurrentPlugin(currentStep.value);
        }
        stepDrawerShow();
      };

      const stepAdd = (emit) => {
        mode.value = "add";
        const step = {
          id: nanoid(),
          title: "新任务",
          type: undefined,
          _isAdd: true,
          input: {},
          status: null
        };
        stepOpen(step, emit);
      };

      const stepEdit = (step, emit) => {
        mode.value = "edit";
        stepOpen(step, emit);
      };

      const stepView = (step, emit) => {
        mode.value = "view";
        stepOpen(step, emit);
      };

      const changeCurrentPlugin = (step) => {
        const stepType = step.type;
        const pluginDefine = stepPluginDefineList.value.find((p) => {
          return p.name === stepType;
        });
        if (pluginDefine) {
          step.type = stepType;
          step._isAdd = false;
          currentPlugin.value = pluginDefine;
        }
        console.log("currentStepTypeChanged:", currentStep.value);
        console.log("currentStepPlugin:", currentPlugin.value);
      };

      const stepSave = async (e) => {
        console.log("currentStepSave", currentStep.value);
        try {
          await stepFormRef.value.validate();
        } catch (e) {
          console.error("表单验证失败:", e);
          return;
        }

        callback.value("save", currentStep.value);
        stepDrawerClose();
      };

      const stepDelete = () => {
        Modal.confirm({
          title: "确认",
          content: `确定要删除此步骤吗？`,
          async onOk() {
            callback.value("delete");
            stepDrawerClose();
          }
        });
      };

      const blankFn = () => {
        return {};
      };
      return {
        stepTypeSelected,
        stepTypeSave,
        stepPluginDefineList,
        stepFormRef,
        mode,
        stepAdd,
        stepEdit,
        stepView,
        stepDrawerShow,
        stepDrawerVisible,
        stepDrawerOnAfterVisibleChange,
        currentStep,
        currentPlugin,
        stepSave,
        stepDelete,
        rules,
        blankFn
      };
    }

    return {
      ...useStepForm(),
      labelCol: { span: 6 },
      wrapperCol: { span: 16 }
    };
  }
};
</script>

<style lang="less">
.pi-step-form {
  .body {
    padding: 10px;
    .ant-card {
      margin-bottom: 10px;

      &.current {
        border-color: #00b7ff;
      }

      .ant-card-meta-title {
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
      }

      .ant-avatar {
        width: 24px;
        height: 24px;
        flex-shrink: 0;
      }

      .title {
        margin-left: 5px;
        white-space: nowrap;
        flex: 1;
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .ant-card-body {
      padding: 14px;
      height: 100px;

      overflow-y: hidden;

      .ant-card-meta-description {
        font-size: 10px;
        line-height: 20px;
        height: 40px;
        color: #7f7f7f;
      }
    }
  }
}
</style>
