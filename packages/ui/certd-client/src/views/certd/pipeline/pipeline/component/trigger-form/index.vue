<template>
  <a-drawer
    v-model:open="triggerDrawerVisible"
    placement="right"
    :closable="true"
    width="600px"
    class="pi-trigger-form"
    @after-open-change="triggerDrawerOnAfterVisibleChange"
  >
    <template #title>
      编辑触发器
      <a-button v-if="mode === 'edit'" @click="triggerDelete()">
        <template #icon><DeleteOutlined /></template>
      </a-button>
    </template>
    <template v-if="currentTrigger">
      <pi-container>
        <a-form
          ref="triggerFormRef"
          class="trigger-form"
          :model="currentTrigger"
          :label-col="labelCol"
          :wrapper-col="wrapperCol"
        >
          <fs-form-item
            v-model="currentTrigger.title"
            :item="{
              title: '触发器名称',
              key: 'title',
              component: {
                name: 'a-input',
                vModel: 'value',
                disabled: !editMode
              },
              rules: [{ required: true, message: '此项必填' }]
            }"
          />

          <fs-form-item
            v-model="currentTrigger.type"
            :item="{
              title: '类型',
              key: 'type',
              value: 'timer',
              component: {
                name: 'a-select',
                vModel: 'value',
                disabled: !editMode,
                options: [{ value: 'timer', label: '定时' }]
              },
              rules: [{ required: true, message: '此项必填' }]
            }"
          />

          <fs-form-item
            v-model="currentTrigger.props.cron"
            :item="{
              title: '定时脚本',
              key: 'props.cron',
              component: {
                disabled: !editMode,
                name: 'a-input',
                vModel: 'value'
              },
              helper: 'cron表达式，例如： 0 0 3 * * * ，表示每天凌晨3点触发',
              rules: [{ required: true, message: '此项必填' }]
            }"
          />
        </a-form>

        <template #footer>
          <a-form-item v-if="editMode" :wrapper-col="{ span: 14, offset: 4 }">
            <a-button type="primary" @click="triggerSave"> 确定 </a-button>
          </a-form-item>
        </template>
      </pi-container>
    </template>
  </a-drawer>
</template>

<script>
import { message, Modal } from "ant-design-vue";
import { inject, ref } from "vue";
import _ from "lodash-es";
import { nanoid } from "nanoid";
export default {
  name: "PiTriggerForm",
  props: {
    editMode: {
      type: Boolean,
      default: true
    }
  },
  emits: ["update"],
  setup(props, context) {
    /**
     *  trigger drawer
     * @returns
     */
    function useTriggerForm() {
      const mode = ref("add");
      const callback = ref();
      const currentTrigger = ref({ title: undefined, input: {} });
      const currentPlugin = ref({});
      const triggerFormRef = ref(null);
      const triggerDrawerVisible = ref(false);
      const rules = ref({
        name: [
          {
            type: "string",
            required: true,
            message: "请输入名称"
          }
        ]
      });

      const triggerDrawerShow = () => {
        triggerDrawerVisible.value = true;
      };
      const triggerDrawerClose = () => {
        triggerDrawerVisible.value = false;
      };

      const triggerDrawerOnAfterVisibleChange = (val) => {
        console.log("triggerDrawerOnAfterVisibleChange", val);
      };

      const triggerOpen = (trigger, emit) => {
        callback.value = emit;
        currentTrigger.value = _.cloneDeep(trigger);
        console.log("currentTriggerOpen", currentTrigger.value);
        triggerDrawerShow();
      };

      const triggerAdd = (emit) => {
        mode.value = "add";
        const trigger = { id: nanoid(), title: "定时触发", type: "timer", props: {} };
        triggerOpen(trigger, emit);
      };

      const triggerEdit = (trigger, emit) => {
        mode.value = "edit";
        triggerOpen(trigger, emit);
      };

      const triggerView = (trigger, emit) => {
        mode.value = "view";
        triggerOpen(trigger, emit);
      };

      const triggerSave = async (e) => {
        console.log("currentTriggerSave", currentTrigger.value);
        try {
          await triggerFormRef.value.validate();
        } catch (e) {
          console.error("表单验证失败:", e);
          return;
        }

        callback.value("save", currentTrigger.value);
        triggerDrawerClose();
      };

      const triggerDelete = () => {
        Modal.confirm({
          title: "确认",
          content: `确定要删除此触发器吗？`,
          async onOk() {
            callback.value("delete");
            triggerDrawerClose();
          }
        });
      };

      const blankFn = () => {
        return {};
      };
      return {
        triggerFormRef,
        mode,
        triggerAdd,
        triggerEdit,
        triggerView,
        triggerDrawerShow,
        triggerDrawerVisible,
        triggerDrawerOnAfterVisibleChange,
        currentTrigger,
        currentPlugin,
        triggerSave,
        triggerDelete,
        rules,
        blankFn
      };
    }

    return {
      ...useTriggerForm(),
      labelCol: { span: 6 },
      wrapperCol: { span: 16 }
    };
  }
};
</script>

<style lang="less">
.pi-trigger-form {
}
</style>
