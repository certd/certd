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
        title: "运行模式",
        form: {
          value: false,
          required: true,
          helper: "强制重新运行：清除流水线所有状态，全部重新执行\n普通运行：成功过的任务会跳过",
          component: {
            name: "fs-dict-radio",
            vModel: "value",
            style: {
              marginTop: "5px",
            },
            dict: dict({
              data: [
                {
                  label: "普通运行",
                  value: false,
                },
                {
                  label: "强制重新运行",
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
