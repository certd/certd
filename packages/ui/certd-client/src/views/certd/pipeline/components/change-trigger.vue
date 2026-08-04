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
    title: "Scheduled Trigger",
    type: "timer",
    props: form.clear ? false : form.props,
    random: form.random,
    randomRange: form.randomRange,
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
        title: "Set/Clear",
        form: {
          value: false,
          component: {
            name: "fs-dict-switch",
            vModel: "checked",
            dict: dict({
              data: [
                {
                  label: "Set Schedule",
                  value: false,
                },
                {
                  label: "Clear Schedule",
                  value: true,
                },
              ],
            }),
          },
        },
      },
      random: {
        title: "Random Time",
        form: {
          value: true,
          helper: "Whether to assign a random time to the pipeline",
          show: compute(({ form }) => {
            return form.clear !== true;
          }),
          component: {
            name: "fs-dict-radio",
            vModel: "value",
            dict: dict({
              data: [
                {
                  label: "Random Time",
                  value: true,
                },
                {
                  label: "Fixed Time",
                  value: false,
                },
              ],
            }),
          },
        },
      },
      randomRange: {
        title: "Random Time Range",
        form: {
          value: ["00:00:00", "08:00:00"],
          helper: "Random time range, in seconds",
          component: {
            //  <a-time-range-picker :bordered="false" />
            name: "a-time-range-picker",
            vModel: "value",
            valueFormat: "HH:mm:ss",
          },
          show: compute(({ form }) => {
            return form.clear !== true && form.random === true;
          }),
          rules: [{ required: true, message: "Please selectRandom Time Range" }],
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
            return form.clear !== true && form?.random !== true;
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
