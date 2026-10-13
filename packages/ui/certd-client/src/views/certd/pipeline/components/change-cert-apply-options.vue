<template>
  <fs-button icon="ph:certificate" class="need-plus" type="link" text="修改证书申请参数" @click="openFormDialog"></fs-button>
  <fs-form-wrapper ref="formWrapperRef"></fs-form-wrapper>
</template>

<script setup lang="ts">
import { useFormWrapper } from "@fast-crud/fast-crud";
import { cloneDeep } from "lodash-es";
import { provide, ref } from "vue";
import * as api from "../api";
import { usePluginStore } from "/@/store/plugin";
import { useSettingStore } from "/@/store/settings";
import { useReference } from "/@/use/use-refrence";

const props = defineProps<{
  selectedRowKeys: any[];
}>();

const emit = defineEmits<{
  change: any;
}>();

const batchUpdateFields = ["challengeType", "sslProvider", "acmeAccountAccessId", "renewDays", "privateKeyType", "successNotify"];

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
const formWrapperRef = ref<any>();
function open(opts: any) {
  return new Promise((resolve, reject) => {
    formWrapperRef.value.open(opts);
  });
}
const { openCrudFormDialog } = useFormWrapper({ open });
const settingStore = useSettingStore();
const pluginStore = usePluginStore();
const certApplyDefineRef = ref();
provide("getCurrentPluginDefine", () => {
  return certApplyDefineRef;
});

function createInputColumn(field: string, inputDefine: any) {
  const form = cloneDeep(inputDefine);
  useReference(form);
  delete form.value;
  delete form.rules;
  form.required = false;
  if (field === "challengeType") {
    form.component = {
      ...form.component,
      options: [{ value: "auto", label: "自动匹配" }],
    };
  } else if (field === "successNotify") {
    form.component = {
      name: "a-select",
      vModel: "value",
      options: [
        { value: true, label: "是" },
        { value: false, label: "否" },
      ],
    };
  }

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
    const inputDefine = inputDefines[field];
    if (inputDefine == null) {
      continue;
    }
    columns[field] = createInputColumn(field, inputDefine);
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
  certApplyDefineRef.value = certApplyPlugin;
  const crudOptions: any = {
    columns: createColumns(certApplyInput),
    form: {
      initialForm: { type: "CertApply" },
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
