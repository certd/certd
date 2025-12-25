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
      random: {
        title: "随机时间",
        form: {
          value: true,
          helper: "是否给流水线随机设置一个时间",
          component: {
            name: "fs-dict-switch",
            vModel: "checked",
            dict: dict({
              data: [
                {
                  label: "随机时间",
                  value: true,
                },
                {
                  label: "固定时间",
                  value: false,
                },
              ],
            }),
          },
        },
      },
      randomRange: {
        title: "随机时间范围",
        form: {
          value: ["00:00:00", "08:00:00"],
          helper: "随机时间范围，单位秒",
          component: {
            //  <a-time-range-picker :bordered="false" />
            name: "a-time-range-picker",
            vModel: "value",
            valueFormat: "HH:mm:ss",
          },
          show: compute(({ form }) => {
            return form.clear !== true && form.random === true;
          }),
          rules: [{ required: true, message: "请选择随机时间范围" }],
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
