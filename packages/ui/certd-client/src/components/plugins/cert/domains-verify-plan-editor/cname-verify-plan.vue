<template>
  <table class="cname-verify-plan">
    <thead>
      <tr>
        <td class="col-host">{{ t("certd.verifyPlan.hostRecord") }}</td>
        <td class="col-type center">{{ t("certd.verifyPlan.recordType") }}</td>
        <td class="col-value">{{ t("certd.verifyPlan.setCnameRecord") }}</td>
        <td class="col-status center">{{ t("certd.status") }}</td>
        <td class="col-action center">{{ t("certd.verifyPlan.operation") }}</td>
      </tr>
    </thead>
    <template v-for="key in domains" :key="key">
      <cname-record-info :domain="key" @change="onRecordChange(key, $event)" />
    </template>
  </table>
</template>

<script lang="ts" setup>
import { CnameRecord } from "/@/components/plugins/cert/domains-verify-plan-editor/api";
import CnameRecordInfo from "/@/components/plugins/cert/domains-verify-plan-editor/cname-record-info.vue";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

defineOptions({
  name: "CnameVerifyPlan",
});

const { t } = useI18n();

const emit = defineEmits(["update:modelValue", "change"]);

const props = defineProps<{
  modelValue: Record<string, any>;
}>();

const domains = computed(() => {
  return Object.keys(props.modelValue);
});

function onRecordChange(domain: string, record: CnameRecord) {
  const value = { ...props.modelValue };
  value[domain] = record;
  emit("update:modelValue", value);
  emit("change", value);
}
</script>

<style lang="less">
.cname-verify-plan {
  width: 100%;
  table-layout: fixed;
  .col-host {
    width: 220px;
  }
  .col-type {
    width: 100px;
  }
  .col-value {
    width: 360px;
  }
  .col-status {
    width: 120px;
  }
  .col-action {
    width: 150px;
  }
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
