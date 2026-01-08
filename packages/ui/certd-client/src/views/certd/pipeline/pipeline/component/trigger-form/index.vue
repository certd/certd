<template>
  <a-drawer v-model:open="triggerDrawerVisible" placement="right" :closable="true" width="650px" class="pi-trigger-form" @after-open-change="triggerDrawerOnAfterVisibleChange">
    <template #title>
      <div>
        {{ t("certd.editTrigger") }}
        <a-button v-if="mode === 'edit'" danger @click="triggerDelete()">
          <template #icon>
            <DeleteOutlined />
          </template>
        </a-button>
      </div>
    </template>
    <template v-if="currentTrigger">
      <pi-container>
        <a-form ref="triggerFormRef" class="trigger-form" :model="currentTrigger" :label-col="labelCol" :wrapper-col="wrapperCol">
          <fs-form-item
            :model-value="currentTrigger.type"
            :item="{
              title: t('certd.type'),
              key: 'type',
              value: 'timer',
              component: {
                name: 'a-select',
                vModel: 'value',
                disabled: !editMode,
                options: [
                  { value: 'timer', label: t('certd.schedule') },
                  { value: 'webhook', label: t('certd.webhook') },
                ],
              },
              rules: [{ required: true, message: t('certd.requiredField') }],
            }"
            @update:model-value="typeValueChange($event)"
          />
          <fs-form-item
            v-model="currentTrigger.title"
            :item="{
              title: t('certd.triggerName'),
              key: 'title',
              component: {
                name: 'a-input',
                vModel: 'value',
                disabled: !editMode,
              },
              rules: [{ required: true, message: t('certd.requiredField') }],
            }"
          />

          <timer-form v-if="currentTrigger.type === 'timer'" :edit-mode="editMode" />
          <webhook-form v-if="currentTrigger.type === 'webhook'" :edit-mode="editMode" />
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
import { Modal } from "ant-design-vue";
import * as _ from "lodash-es";
import { nanoid } from "nanoid";
import { ref, provide } from "vue";
import { useI18n } from "/src/locales/";
import TimerForm from "./timer-form.vue";
import WebhookForm from "./webhook-form.vue";
export default {
  name: "PiTriggerForm",
  components: {
    TimerForm,
    WebhookForm,
  },
  props: {
    editMode: {
      type: Boolean,
      default: true,
    },
  },
  emits: ["update"],
  setup(props, context) {
    /**
     *  trigger drawer
     * @returns
     */
    const { t } = useI18n();
    function useTriggerForm() {
      const mode = ref("add");
      const callback = ref();
      const currentTrigger = ref({ title: undefined, input: {} });
      provide("trigger:get", () => currentTrigger);
      const currentPlugin = ref({});
      const triggerFormRef = ref(null);
      const triggerDrawerVisible = ref(false);
      const rules = ref({
        name: [
          {
            type: "string",
            required: true,
            message: t("certd.enterName"),
          },
        ],
      });

      const triggerDrawerShow = () => {
        triggerDrawerVisible.value = true;
      };
      const triggerDrawerClose = () => {
        triggerDrawerVisible.value = false;
      };

      const triggerDrawerOnAfterVisibleChange = val => {
        console.log("triggerDrawerOnAfterVisibleChange", val);
      };

      const triggerOpen = (trigger, emit) => {
        callback.value = emit;
        currentTrigger.value = _.cloneDeep(trigger);
        console.log("currentTriggerOpen", currentTrigger.value);
        triggerDrawerShow();
      };

      const triggerAdd = (triggerType, emit) => {
        mode.value = "add";
        const trigger = { id: nanoid(), title: t("certd.timerTrigger"), type: "timer", props: {} };
        if (triggerType === "webhook") {
          trigger.type = "webhook";
          trigger.title = "Webhook触发";
        }
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

      const triggerSave = async e => {
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
          title: t("certd.confirm"),
          content: t("certd.confirmDeleteTrigger"),
          async onOk() {
            callback.value("delete");
            triggerDrawerClose();
          },
        });
      };

      const blankFn = () => {
        return {};
      };

      function typeValueChange(value) {
        if (value === "webhook") {
          if (currentTrigger.value.title === "定时触发" || !currentTrigger.value.title) {
            currentTrigger.value.title = "Webhook触发";
          }
        } else if (value === "timer") {
          if (currentTrigger.value.title === "Webhook触发" || !currentTrigger.value.title) {
            currentTrigger.value.title = "定时触发";
          }
        }
        currentTrigger.value.type = value;
      }
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
        blankFn,
        typeValueChange,
      };
    }

    return {
      ...useTriggerForm(),
      labelCol: { span: 6 },
      wrapperCol: { span: 16 },
      t,
    };
  },
};
</script>

<style lang="less">
.pi-trigger-form {
}
</style>
