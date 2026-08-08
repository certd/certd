<template>
  <fs-button icon="mdi:format-list-group" class="need-plus" type="link" text="修改通知" @click="openFormDialog"></fs-button>
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
    title: form.title || "通知",
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
        title: "触发时机",
        form: {
          value: ["error", "turnToSuccess"],
          component: {
            name: "a-select",
            vModel: "value",
            mode: "multiple",
            options: [
              { value: "start", label: "开始时" },
              { value: "success", label: "成功时" },
              { value: "turnToSuccess", label: "失败转成功时" },
              { value: "error", label: "失败时" },
            ],
          },
          helper: `建议仅选择'失败时'和'失败转成功'两种即可`,
          rules: [{ required: true, message: "此项必填" }],
        },
      },
      notificationId: {
        title: "通知配置",
        form: {
          component: {
            name: NotificationSelector,
            on: {
              selectedChange({ form, $event }: any) {
                form.title = $event?.name || "通知";
              },
            },
          },
          helper: "请选择通知方式",
          rules: [{ required: true, message: "此项必填" }],
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
        title: "批量修改通知",
        width: 600,
      },
    },
  } as any;
  await openCrudFormDialog({ crudOptions });
}
</script>
