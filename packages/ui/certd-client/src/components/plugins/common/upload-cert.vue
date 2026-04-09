<template>
  <div class="upload-cert">
    <fs-button v-model:loading="loading" type="primary" text="上传" v-bind="props.button" @click="openUploadCertDialog"></fs-button>
  </div>
</template>
<script lang="ts" setup>
import { message } from "ant-design-vue";
import { useFormDialog } from "../../../use/use-dialog";
import { computed, inject, ref } from "vue";
import { doRequest } from "../lib";
import { getInputFromForm } from "./utils";
import { UploadCertProps } from "./types";
import { merge } from "lodash-es";

const props = defineProps<UploadCertProps>();
const loading = ref(false);

const emit = defineEmits(["submit"]);
const { openFormDialog } = useFormDialog();
const pipeline = inject("pipeline", null);

const getCurrentPluginDefine: any = inject("getCurrentPluginDefine", () => {
  return {};
});
const getScope: any = inject("get:scope", () => {
  return {};
});
const getPluginType: any = inject("get:plugin:type", () => {
  return "plugin";
});
const title = computed(() => props.title || "上传证书");
function openUploadCertDialog() {
  const columns = merge(
    {
      certName: {
        title: "证书名称",
        form: {
          component: {
            name: "a-input",
            vModel: "value",
          },
          helper: "上传后证书显示名称",
        },
      },
    },
    props.columns
  );
  openFormDialog({
    title: title.value,
    columns: {
      certName: {
        title: "证书名称",
        form: {
          component: {
            name: "a-input",
            vModel: "value",
          },
        },
      },
      ...props.columns,
    },
    onSubmit: async (form: any) => {
      const pluginType = getPluginType();
      const scope = getScope();
      const { input, record } = getInputFromForm(scope.form, pluginType);
      loading.value = true;
      try {
        const res = await doRequest(
          {
            type: pluginType,
            typeName: scope.form.type,
            action: "onUploadCert",
            input,
            record,
            data: {
              pipelineId: pipeline?.value?.id,
              ...form,
            },
          },
          {
            // onError(err: any) {
            //   message.error(err.message);
            // },
            showErrorNotify: true,
          }
        );
        message.success("上传成功");
        emit("submit");
      } finally {
        loading.value = false;
      }
    },
  });
}
</script>
<style lang="less">
.upload-cert {
  display: flex;
  align-items: center;
}
</style>
