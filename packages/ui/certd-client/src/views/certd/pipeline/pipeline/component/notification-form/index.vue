<template>
  <a-drawer v-model:open="notificationDrawerVisible" placement="right" :closable="true" width="600px" class="pi-notification-form" @after-open-change="notificationDrawerOnAfterVisibleChange">
    <template #title>
      <div>
        {{ t("certd.edit_notification") }}
        <a-button v-if="mode === 'edit'" danger @click="notificationDelete()">
          <template #icon>
            <DeleteOutlined />
          </template>
        </a-button>
      </div>
    </template>
    <template v-if="currentNotification">
      <pi-container>
        <a-form ref="notificationFormRef" class="notification-form" :model="currentNotification" :label-col="labelCol" :wrapper-col="wrapperCol">
          <fs-form-item
            v-if="currentNotification.type === 'email'"
            v-model="currentNotification.type"
            :item="{
              title: t('certd.type'),
              key: 'type',
              value: 'email',
              component: {
                name: 'a-select',
                vModel: 'value',
                disabled: !editMode,
                options: [
                  { value: 'email', label: t('certd.email') },
                  { value: 'other', label: t('certd.other_notification_method') },
                ],
              },
              rules: [{ required: true, message: t('certd.required') }],
            }"
          />
          <fs-form-item
            v-model="currentNotification.when"
            :item="{
              title: t('certd.trigger_time'),
              key: 'when',
              value: ['error'],
              component: {
                name: 'a-select',
                vModel: 'value',
                disabled: !editMode,
                mode: 'multiple',
                options: [
                  { value: 'start', label: t('certd.start_time') },
                  { value: 'success', label: t('certd.success_time') },
                  { value: 'turnToSuccess', label: t('certd.fail_to_success_time') },
                  { value: 'error', label: t('certd.fail_time') },
                ],
              },
              helper: t('certd.helper_suggest_fail_only'),
              rules: [{ required: true, message: t('certd.required') }],
            }"
          />
          <pi-notification-form-email v-if="currentNotification.type === 'email'" ref="optionsRef" v-model:options="currentNotification.options"></pi-notification-form-email>

          <fs-form-item
            v-else
            v-model="currentNotification.notificationId"
            :item="{
              title: t('certd.notification_config'),
              key: 'notificationId',
              component: {
                disabled: !editMode,
                name: NotificationSelector,
                onSelectedChange,
              },
              helper: t('certd.please_select_notification'),
              rules: [{ required: true, message: t('certd.required') }],
            }"
          />
        </a-form>

        <template #footer>
          <a-form-item v-if="editMode" :wrapper-col="{ span: 14, offset: 4 }">
            <a-button type="primary" @click="notificationSave"> {{ t("certd.confirm") }} </a-button>
          </a-form-item>
        </template>
      </pi-container>
    </template>
  </a-drawer>
</template>

<script lang="ts" setup>
import { Modal } from "ant-design-vue";
import { ref, Ref } from "vue";
import * as _ from "lodash-es";
import { nanoid } from "nanoid";
import PiNotificationFormEmail from "./pi-notification-form-email.vue";
import NotificationSelector from "/@/views/certd/notification/notification-selector/index.vue";
import { useI18n } from "/src/locales";
import { cloneDeep } from "lodash-es";

const { t } = useI18n();

defineOptions({
  name: "PiNotificationForm",
});

const props = defineProps<{
  editMode: boolean;
}>();

const emit = defineEmits(["update"]);

/**
 *  notification drawer
 * @returns
 */
const mode = ref("add");
const callback = ref();
const currentNotification: Ref<any> = ref({ type: undefined, when: [], options: {}, notificationId: undefined, title: "" });
const currentPlugin = ref({});
const notificationFormRef = ref(null);
const notificationDrawerVisible = ref(false);
const optionsRef = ref();
const rules = ref({
  type: [
    {
      type: "string",
      required: true,
      message: t("certd.please_select_type"),
    },
  ],
  when: [
    {
      type: "string",
      required: true,
      message: t("certd.please_select_trigger_time"),
    },
  ],
  notificationId: [
    {
      type: "number",
      required: true,
      message: t("certd.please_select_notification_config"),
    },
  ],
});
const notificationDrawerShow = () => {
  notificationDrawerVisible.value = true;
};
const notificationDrawerClose = () => {
  notificationDrawerVisible.value = false;
};

const notificationDrawerOnAfterVisibleChange = (val: any) => {
  console.log("notificationDrawerOnAfterVisibleChange", val);
};

const notificationOpen = (notification: any, emit: any) => {
  callback.value = emit;
  currentNotification.value = cloneDeep(notification);
  console.log("currentNotificationOpen", currentNotification.value);
  notificationDrawerShow();
};

const notificationAdd = (emit: any) => {
  mode.value = "add";
  const notification = { id: nanoid(), type: "custom", when: ["error", "turnToSuccess"] };
  notificationOpen(notification, emit);
};

const notificationEdit = (notification: any, emit: any) => {
  mode.value = "edit";
  notificationOpen(notification, emit);
};

const notificationView = (notification: any, emit: any) => {
  mode.value = "view";
  notificationOpen(notification, emit);
};

const notificationSave = async (e: any) => {
  if (optionsRef.value) {
    currentNotification.value.options = await optionsRef.value.getValue();
  }

  console.log("currentNotificationSave", currentNotification.value);
  try {
    await notificationFormRef.value.validate();
  } catch (e) {
    console.error("表单验证失败:", e);
    return;
  }

  callback.value("save", currentNotification.value);
  notificationDrawerClose();
};

const notificationDelete = () => {
  Modal.confirm({
    title: t("certd.confirm"),
    content: t("certd.confirm_delete_trigger"),
    async onOk() {
      callback.value("delete");
      notificationDrawerClose();
    },
  });
};

const blankFn = () => {
  return {};
};

function onSelectedChange(node: any) {
  currentNotification.value.title = node?.name || null;
}

const labelCol = { span: 6 };
const wrapperCol = { span: 16 };

defineExpose({
  notificationAdd,
  notificationEdit,
  notificationView,
  notificationDelete,
  notificationSave,
  notificationOpen,
  notificationDrawerShow,
});
</script>

<style lang="less">
.pi-notification-form {
}
</style>
