<template>
  <div class="upload-cert">
    <fs-button v-model:loading="loading" type="primary" :text="t('certd.pluginCommon.upload')" v-bind="props.button" @click="openUploadCertDialog"></fs-button>
  </div>
</template>
<script lang="ts" setup>
import { message } from "ant-design-vue";
import { useFormDialog } from "../../../use/use-dialog";
import { computed, inject, ref } from "vue";
import { useI18n } from "vue-i18n";
import { doRequest } from "../lib";
import { getInputFromForm } from "./utils";
import { UploadCertProps } from "./types";
import { merge } from "lodash-es";

const props = defineProps<UploadCertProps>();
const loading = ref(false);
const { t } = useI18n();

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
const title = computed(() => props.title || t("certd.pluginCommon.uploadCert"));
function openUploadCertDialog() {
  const columns = merge(
    {
      certName: {
        title: t("certd.pluginCommon.certName"),
        form: {
          component: {
            name: "a-input",
            vModel: "value",
          },
          helper: t("certd.pluginCommon.certNameHelper"),
        },
      },
    },
    props.columns
  );
  openFormDialog({
    title: title.value,
    columns: {
      certName: {
        title: t("certd.pluginCommon.certName"),
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
        message.success(t("certd.pluginCommon.uploadSuccess"));
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
