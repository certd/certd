<template>
  <fs-button icon="ion:checkmark-circle-outline" class="need-plus" type="link" text="修改证书申请成功通知" @click="openFormDialog"></fs-button>
</template>

<script setup lang="ts">
import { useFormWrapper } from "@fast-crud/fast-crud";
import { notification } from "ant-design-vue";
import * as api from "../api";
import { useSettingStore } from "/@/store/settings";
import NotificationSelector from "/@/views/certd/notification/notification-selector/index.vue";

const props = defineProps<{ selectedRowKeys: any[] }>();
const emit = defineEmits<{ change: [] }>();
const { openCrudFormDialog } = useFormWrapper();
const settingStore = useSettingStore();

async function openFormDialog() {
  settingStore.checkPlus();
  const crudOptions: any = {
    columns: {
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
          helper: "证书申请成功后发送此通知",
          rules: [{ required: true, message: "请选择通知方式" }],
        },
      },
    },
    form: {
      mode: "edit",
      async doSubmit({ form }: any) {
        await api.BatchUpdateNotificaiton(props.selectedRowKeys, {
          type: "other",
          title: form.title || "证书申请成功通知",
          when: ["success"],
          replaceWhen: ["success"],
          notificationId: form.notificationId,
        });
        notification.success({ message: "证书申请成功通知修改成功" });
        emit("change");
      },
      col: { span: 22 },
      labelCol: { style: { width: "100px" } },
      wrapper: { title: "批量修改证书申请成功通知", width: 600 },
    },
  };
  await openCrudFormDialog({ crudOptions });
}
</script>
