<template>
  <fs-button icon="mdi:format-list-group" class="need-plus" type="link" text="Move to Another Project" @click="openProjectSelectDialog"></fs-button>
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
async function batchUpdateProjectRequest(toProjectId: number) {
  await api.BatchUpdateProject(props.selectedRowKeys, toProjectId);
  emit("change");
}

const pipelineProjectDictRef = dict({
  url: "/enterprise/project/all",
  value: "id",
  label: "name",
});
const { openCrudFormDialog } = useFormWrapper();
const settingStore = useSettingStore();
async function openProjectSelectDialog() {
  settingStore.checkPlus();
  const crudOptions: any = {
    columns: {
      toProjectId: {
        title: "Move to Project",
        type: "dict-select",
        dict: pipelineProjectDictRef,
        form: {
          rules: [{ required: true, message: "Please select a project" }],
        },
      },
    },
    form: {
      mode: "edit",
      //@ts-ignore
      async doSubmit({ form }) {
        await batchUpdateProjectRequest(form.toProjectId);
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
        title: "Batch Move to Another Project",
        width: 600,
      },
    },
  } as any;
  await openCrudFormDialog({ crudOptions });
}
</script>
