<template>
  <table class="cname-verify-plan">
    <thead>
      <tr>
        <td style="width: 160px">主机记录</td>
        <td style="width: 250px">请设置CNAME记录（验证成功以后不要删除）</td>
        <td style="width: 120px" class="center">状态</td>
        <td style="width: 80px" class="center">操作</td>
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

defineOptions({
  name: "CnameVerifyPlan"
});

const emit = defineEmits<{
  "update:modelValue": any;
  change: Record<string, any>;
}>();

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
  tr {
    td {
      border: 0 !important;
      border-bottom: 1px solid #e8e8e8 !important;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;

      &.center {
        text-align: center;
      }
    }
    &:last-child {
      td {
        border-bottom: 0 !important;
      }
    }
  }
}
</style>
