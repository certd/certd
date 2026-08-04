<template>
  <fs-button icon="mdi:format-list-group" class="need-plus" type="link" text="Change Notification" @click="openFormDialog"></fs-button>
</template>
<script setup lang="ts">
import { useFormWrapper } from "@fast-crud/fast-crud";
import * as api from "../api";
import { useSettingStore } from "/@/store/settings";
import NotificationSelector from "/@/views/certd/notification/notification-selector/index.vue";

const props = defineProps<{
  selectedRowKeys: any[];
}>();

const emit = defineEmits<{
  change: any;
}>();
async function batchUpdateRequest(form: any) {
  /**
   * type: NotificationType;
   *   when: NotificationWhen[];
   *   options?: EmailOptions;
   *   notificationId: number;
   *   title: string;
   */
  await api.BatchUpdateNotificaiton(props.selectedRowKeys, {
    type: "other",
    title: form.title || "Notification",
    when: form.when,
    notificationId: form.notificationId,
  });
  emit("change");
}

const { openCrudFormDialog } = useFormWrapper();
const settingStore = useSettingStore();
async function openFormDialog() {
  settingStore.checkPlus();
  const crudOptions: any = {
    columns: {
      when: {
        title: "Trigger Timing",
        form: {
          value: ["error", "turnToSuccess"],
          component: {
            name: "a-select",
            vModel: "value",
            mode: "multiple",
            options: [
              { value: "start", label: "On Start" },
              { value: "success", label: "On Success" },
              { value: "turnToSuccess", label: "On Failure to Success" },
              { value: "error", label: "On Failure" },
            ],
          },
          helper: `It is recommended to select only 'On Failure' and 'On Failure to Success'`,
          rules: [{ required: true, message: "This field is required" }],
        },
      },
      notificationId: {
        title: "Notification Configuration",
        form: {
          component: {
            name: NotificationSelector,
            on: {
              selectedChange({ form, $event }: any) {
                form.title = $event?.name || "Notification";
              },
            },
          },
          helper: "Please select a notification method",
          rules: [{ required: true, message: "This field is required" }],
        },
      },
    },
    form: {
      mode: "edit",
      //@ts-ignore
      async doSubmit({ form }) {
        await batchUpdateRequest(form);
      },
      col: {
        span: 22,
      },
      labelCol: {
        style: {
          width: "100px",
        },
      },
      wrapper: {
        title: "Batch Change Notification",
        width: 600,
      },
    },
  } as any;
  await openCrudFormDialog({ crudOptions });
}
</script>
