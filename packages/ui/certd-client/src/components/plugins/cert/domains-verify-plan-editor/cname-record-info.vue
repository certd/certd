<template>
  <tbody v-if="cnameRecord" class="cname-record-info">
    <tr>
      <!--    <td class="domain">-->
      <!--      {{ props.domain }}-->
      <!--    </td>-->
      <td class="host-record" :title="'域名：' + props.domain">
        <fs-copyable v-model="cnameRecord.hostRecord"></fs-copyable>
      </td>
      <td class="record-value">
        <fs-copyable v-model="cnameRecord.recordValue"></fs-copyable>
      </td>
      <td class="status center flex-center">
        <fs-values-format v-model="cnameRecord.status" :dict="statusDict" />
        <fs-icon icon="ion:refresh-outline" class="pointer" @click="doVerify"></fs-icon>
      </td>
    </tr>
  </tbody>
</template>

<script lang="ts" setup>
import { CnameRecord, GetByDomain } from "/@/components/plugins/cert/domains-verify-plan-editor/api";
import { ref, watch } from "vue";
import { dict } from "@fast-crud/fast-crud";
import * as api from "./api.js";
const statusDict = dict({
  data: [
    { label: "待设置CNAME", value: "cname", color: "warning" },
    { label: "验证中", value: "validating", color: "primary" },
    { label: "验证成功", value: "valid", color: "success" },
    { label: "验证失败", value: "failed", color: "error" }
  ]
});

defineOptions({
  name: "CnameRecordInfo"
});

const props = defineProps<{
  domain: string;
}>();

const emit = defineEmits<{
  change: {
    id: number | null;
    status: string | null;
  };
}>();

const cnameRecord = ref<CnameRecord | null>(null);

function onRecordChange() {
  emit("change", {
    id: cnameRecord.value?.id,
    status: cnameRecord.value?.status
  });
}

async function doRefresh() {
  if (!props.domain) {
    return;
  }
  cnameRecord.value = await GetByDomain(props.domain);
  onRecordChange();
}

watch(
  () => props.domain,
  async (value) => {
    await doRefresh();
  },
  {
    immediate: true
  }
);

async function doVerify() {
  if (!cnameRecord.value || !cnameRecord.value.id) {
    return;
  }
  await api.DoVerify(cnameRecord.value.id);
  await doRefresh();
}
</script>

<style lang="less">
.cname-record-info {
  .fs-copyable {
    width: 100%;
  }
}
</style>
