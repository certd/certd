<template>
  <table class="dns-persist-verify-plan">
    <thead>
      <tr>
        <td class="col-host">TXT主机名</td>
        <td class="col-type center">记录类型</td>
        <td class="col-value">请设置TXT记录（验证成功以后不要删除）</td>
        <td class="col-status center">状态</td>
        <td class="col-action center">操作</td>
      </tr>
    </thead>
    <template v-for="key in domains" :key="key">
      <dns-persist-record-info
        :domain="key"
        :ca-type="caType"
        :acme-account-access-id="acmeAccountAccessId"
        :common-acme-account-access-id="commonAcmeAccountAccessId"
        :wildcard="modelValue[key]?.wildcard"
        :persist-until="modelValue[key]?.persistUntil"
        @change="onRecordChange(key, $event)"
      />
    </template>
  </table>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import DnsPersistRecordInfo from "./dns-persist-record-info.vue";
import { DnsPersistRecord } from "./type";

defineOptions({
  name: "DnsPersistVerifyPlan",
});

const emit = defineEmits(["update:modelValue", "change"]);

const props = defineProps<{
  modelValue: Record<string, DnsPersistRecord>;
  caType?: string;
  acmeAccountAccessId?: number;
  commonAcmeAccountAccessId?: number;
}>();

const domains = computed(() => {
  return Object.keys(props.modelValue || {});
});

function onRecordChange(domain: string, record: DnsPersistRecord) {
  const value = { ...props.modelValue };
  value[domain] = {
    ...value[domain],
    ...record,
  };
  emit("update:modelValue", value);
  emit("change", value);
}
</script>

<style lang="less">
.dns-persist-verify-plan {
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
  }
}
</style>
