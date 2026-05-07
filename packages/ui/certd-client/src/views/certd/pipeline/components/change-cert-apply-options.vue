<template>
  <fs-button icon="ph:certificate" class="need-plus" type="link" text="修改证书申请参数" @click="openFormDialog"></fs-button>
</template>

<script setup lang="ts">
import { useFormWrapper } from "@fast-crud/fast-crud";
import { cloneDeep } from "lodash-es";
import * as api from "../api";
import { useSettingStore } from "/@/store/settings";
import { usePluginStore } from "/@/store/plugin";
import { useReference } from "/@/use/use-refrence";

const props = defineProps<{
  selectedRowKeys: any[];
}>();

const emit = defineEmits<{
  change: any;
}>();

const batchUpdateFields = ["renewDays", "privateKeyType"];

function hasFormValue(form: any, field: string) {
  return form[field] != null && form[field] !== "";
}

function buildBatchUpdateOptions(form: any) {
  const options: any = {};
  for (const field of batchUpdateFields) {
    if (hasFormValue(form, field)) {
      options[field] = form[field];
    }
  }
  return options;
}

async function batchUpdateRequest(form: any) {
  const options = buildBatchUpdateOptions(form);
  await api.BatchUpdateCertApplyOptions(props.selectedRowKeys, options);
  emit("change");
}

const { openCrudFormDialog } = useFormWrapper();
const settingStore = useSettingStore();
const pluginStore = usePluginStore();

function createInputColumn(inputDefine: any) {
  const form = cloneDeep(inputDefine);
  useReference(form);
  delete form.value;
  delete form.rules;
  form.required = false;
  if (form.component) {
    form.component.allowClear = true;
  }
  return {
    title: inputDefine.title,
    form,
  };
}

function createColumns(inputDefines: any) {
  const columns: any = {};
  for (const field of batchUpdateFields) {
    columns[field] = createInputColumn(inputDefines[field]);
  }
  return columns;
}

function hasAnyBatchUpdateValue(form: any) {
  return batchUpdateFields.some(field => hasFormValue(form, field));
}

async function openFormDialog() {
  settingStore.checkPlus();
  const certApplyPlugin: any = await pluginStore.getPluginDefine("CertApply");
  const certApplyInput = certApplyPlugin?.input || {};

  const crudOptions: any = {
    columns: createColumns(certApplyInput),
    form: {
      mode: "edit",
      //@ts-ignore
      async doSubmit({ form }) {
        if (!hasAnyBatchUpdateValue(form)) {
          throw new Error("请至少选择一个要修改的参数");
        }
        await batchUpdateRequest(form);
      },
      col: {
        span: 22,
      },
      labelCol: {
        style: {
          width: "120px",
        },
      },
      wrapper: {
        title: "批量修改证书申请参数",
        width: 620,
      },
    },
  } as any;
  await openCrudFormDialog({ crudOptions });
}
</script>
