<template>
  <fs-button icon="mdi:format-list-group" class="need-plus" type="link" text="修改分组" @click="openGroupSelectDialog"></fs-button>
</template>
<script setup lang="ts">
import * as api from "../api";
import { notification } from "ant-design-vue";
import { dict, useFormWrapper } from "@fast-crud/fast-crud";
import { useSettingStore } from "/@/store/settings";

const props = defineProps<{
  selectedRowKeys: any[];
}>();

const emit = defineEmits<{
  change: any;
}>();
async function batchUpdateGroupRequest(groupId: number) {
  await api.BatchUpdateGroup(props.selectedRowKeys, groupId);
  emit("change");
}

const pipelineGroupDictRef = dict({
  url: "/pi/pipeline/group/all",
  value: "id",
  label: "name",
});
const { openCrudFormDialog } = useFormWrapper();
const settingStore = useSettingStore();
async function openGroupSelectDialog() {
  settingStore.checkPlus();
  const crudOptions: any = {
    columns: {
      groupId: {
        title: "分组",
        type: "dict-select",
        dict: pipelineGroupDictRef,
        form: {
          rules: [{ required: true, message: "请选择分组" }],
        },
      },
    },
    form: {
      mode: "edit",
      //@ts-ignore
      async doSubmit({ form }) {
        await batchUpdateGroupRequest(form.groupId);
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
        title: "批量修改分组",
        width: 600,
      },
    },
  } as any;
  await openCrudFormDialog({ crudOptions });
}
</script>
