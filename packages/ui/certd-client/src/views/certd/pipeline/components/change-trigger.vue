<template>
  <fs-button icon="mdi:format-list-group" class="need-plus" type="link" :text="t('certd.editSchedule')" @click="openFormDialog"></fs-button>
</template>

<script setup lang="ts">
import { compute, dict, useFormWrapper } from "@fast-crud/fast-crud";
import * as api from "../api";
import { useSettingStore } from "/@/store/settings";
import { useI18n } from "/src/locales";
import { computed } from "vue";
const { t } = useI18n();

const props = defineProps<{
  selectedRowKeys: any[];
}>();

const emit = defineEmits<{
  change: any;
}>();
async function batchUpdateRequest(form: any) {
  await api.BatchUpdateTrigger(props.selectedRowKeys, {
    title: "定时触发",
    type: "timer",
    props: form.clear ? false : form.props,
  });
  emit("change");
}

const { openCrudFormDialog } = useFormWrapper();

const settingStore = useSettingStore();

async function openFormDialog() {
  settingStore.checkPlus();
  const crudOptions: any = {
    columns: {
      clear: {
        title: "设置/清空",
        form: {
          value: false,
          component: {
            name: "fs-dict-switch",
            vModel: "checked",
            dict: dict({
              data: [
                {
                  label: "设置定时",
                  value: false,
                },
                {
                  label: "清空定时",
                  value: true,
                },
              ],
            }),
          },
        },
      },
      "props.cron": {
        title: t("certd.schedule"),
        form: {
          component: {
            name: "cron-editor",
            vModel: "modelValue",
          },
          show: compute(({ form }) => {
            return form.clear !== true;
          }),
          rules: [{ required: true, message: t("certd.selectCron") }],
        },
      },
    },
    form: {
      mode: "edit",
      initialForm: {
        clear: false,
      },
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
        title: t("certd.batchEditSchedule"),
        width: 600,
      },
    },
  } as any;
  await openCrudFormDialog({ crudOptions });
}
</script>
