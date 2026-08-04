<template>
  <fs-button icon="icon-park-outline:replay-music" class="need-plus" type="link" :text="t('certd.batchRerun')" @click="openFormDialog"></fs-button>
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
  await api.BatchRerun(props.selectedRowKeys, form.force ?? false);
  emit("change");
}

const { openCrudFormDialog } = useFormWrapper();

const settingStore = useSettingStore();

async function openFormDialog() {
  settingStore.checkPlus();
  const crudOptions: any = {
    columns: {
      force: {
        title: "Run Mode",
        form: {
          value: false,
          required: true,
          helper: "Force rerun: clear all pipeline state and rerun everything\nNormal run: tasks that already succeeded will be skipped",
          component: {
            name: "fs-dict-radio",
            vModel: "value",
            style: {
              marginTop: "5px",
            },
            dict: dict({
              data: [
                {
                  label: "Normal Run",
                  value: false,
                },
                {
                  label: "Force Rerun",
                  value: true,
                },
              ],
            }),
          },
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
        title: t("certd.batchRerun"),
        width: 600,
      },
    },
  } as any;
  await openCrudFormDialog({ crudOptions });
}
</script>
