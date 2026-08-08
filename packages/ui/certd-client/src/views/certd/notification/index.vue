<template>
  <fs-page>
    <template #header>
      <div class="title">
        通知管理
        <span class="sub">管理通知配置</span>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding"> </fs-crud>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useMounted } from "/@/use/use-mounted";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { createNotificationApi } from "./api";
import { notificationProvide } from "/@/views/certd/notification/common";

export default defineComponent({
  name: "NotificationManager",
  setup() {
    const api = createNotificationApi();
    notificationProvide(api);
    const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context: { api, permission: { isProjectPermission: true } } });
    useMounted(() => crudExpose.doRefresh());

    return {
      crudBinding,
      crudRef,
    };
  },
});
</script>
