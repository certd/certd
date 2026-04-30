<template>
  <table class="http-verify-plan">
    <thead>
      <tr>
        <td style="width: 160px">{{ t("certd.verifyPlan.websiteDomain") }}</td>
        <td style="width: 100px; text-align: center">{{ t("certd.verifyPlan.uploadMethod") }}</td>
        <td style="width: 150px">{{ t("certd.verifyPlan.uploadAccess") }}</td>
        <td style="width: 200px">{{ t("certd.verifyPlan.websiteRootPath") }}</td>
      </tr>
    </thead>
    <tbody v-if="records" class="http-record-body">
      <template v-for="(item, key) of records" :key="key">
        <tr>
          <td class="domain">
            {{ item.domain }}
          </td>
          <td>
            <fs-dict-select v-model:value="item.httpUploaderType" :dict="uploaderTypeDict" @change="onRecordChange"></fs-dict-select>
          </td>
          <td>
            <access-selector v-model="item.httpUploaderAccess" :type="item.httpUploaderType" @change="onRecordChange"></access-selector>
          </td>
          <td>
            <a-input v-model:value="item.httpUploadRootDir" :placeholder="t('certd.verifyPlan.websiteRootPlaceholder')" @change="onRecordChange"></a-input>
          </td>
        </tr>
      </template>
    </tbody>
  </table>
</template>

<script lang="ts" setup>
import { Ref, ref, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { HttpRecord } from "/@/components/plugins/cert/domains-verify-plan-editor/type";
import { dict } from "@fast-crud/fast-crud";
import { Dicts } from "/@/components/plugins/lib/dicts";

defineOptions({
  name: "HttpVerifyPlan",
});

const { t } = useI18n();

const emit = defineEmits(["update:modelValue", "change"]);

const props = defineProps<{
  modelValue: Record<string, any>;
}>();

const records: Ref<Record<string, HttpRecord>> = ref({});

watch(
  () => {
    return props.modelValue;
  },
  (value: any) => {
    if (value) {
      records.value = {
        ...value,
      };
    }
  },
  {
    immediate: true,
  }
);

async function onRecordChange() {
  await nextTick();
  emit("update:modelValue", records.value);
  emit("change", records.value);
}

const uploaderTypeDict = Dicts.uploaderTypeDict;
</script>

<style lang="less">
.http-verify-plan {
  width: 100%;
  table-layout: fixed;
  tbody tr td {
    border-top: 1px solid #e8e8e8 !important;
  }
  tr {
    td {
      border: 0 !important;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;

      &.center {
        text-align: center;
      }
    }
    //&:last-child {
    //  td {
    //    border-bottom: 0 !important;
    //  }
    //}
  }
}
</style>
