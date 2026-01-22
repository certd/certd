<template>
  <tbody v-if="cnameRecord" class="cname-record-info">
    <tr>
      <!--    <td class="domain">-->
      <!--      {{ props.domain }}-->
      <!--    </td>-->
      <td class="host-record" :title="'域名：' + props.domain">
        <fs-copyable v-model="cnameRecord.hostRecord"></fs-copyable>
      </td>
      <td style="text-align: center">CNAME</td>
      <td class="record-value" :title="cnameRecord.recordValue">
        <fs-copyable v-model="cnameRecord.recordValue"></fs-copyable>
      </td>
      <td class="status center flex-center">
        <fs-values-format v-model="cnameRecord.status" :dict="statusDict" />
        <a-tooltip v-if="cnameRecord.error" :title="cnameRecord.error">
          <fs-icon class="ml-5 color-red" icon="ion:warning-outline"></fs-icon>
        </a-tooltip>
        <a-tooltip v-if="cnameRecord.status === 'valid'" title="重置校验状态，重新校验">
          <fs-icon class="ml-2 color-yellow text-md pointer" icon="solar:undo-left-square-bold" @click="resetStatus"></fs-icon>
        </a-tooltip>
      </td>
      <td class="center">
        <template v-if="cnameRecord.status !== 'valid'">
          <a-button type="primary" size="small" :loading="loading" @click="doVerify">点击验证</a-button>
          <cname-tip :record="cnameRecord"></cname-tip>
        </template>

        <div v-else class="helper" title="后续自动申请证书需要">不要删除CNAME</div>
      </td>
    </tr>
  </tbody>
</template>

<script lang="ts" setup>
import { CnameRecord, GetByDomain } from "/@/components/plugins/cert/domains-verify-plan-editor/api";
import { ref, watch } from "vue";
import { dict } from "@fast-crud/fast-crud";
import * as api from "./api.js";
import CnameTip from "./cname-tip.vue";
import { Modal } from "ant-design-vue";
import { utils } from "/@/utils/index.js";
const statusDict = dict({
  data: [
    { label: "待设置CNAME", value: "cname", color: "warning" },
    { label: "验证中", value: "validating", color: "blue" },
    { label: "验证成功", value: "valid", color: "green" },
    { label: "验证失败", value: "failed", color: "red" },
    { label: "验证超时", value: "timeout", color: "red" },
  ],
});

defineOptions({
  name: "CnameRecordInfo",
});

const props = defineProps<{
  domain: string;
}>();

const emit = defineEmits<{
  change: [
    {
      id: number | null;
      status: string | null;
    },
  ];
}>();

const cnameRecord = ref<CnameRecord | null>(null);

function onRecordChange() {
  emit("change", {
    id: cnameRecord.value?.id,
    status: cnameRecord.value?.status,
  });
}

async function loadRecord() {
  cnameRecord.value = await GetByDomain(props.domain);
}
let refreshIntervalId: any = null;
async function doRefresh() {
  if (!props.domain) {
    return;
  }
  await loadRecord();
  onRecordChange();

  if (cnameRecord.value.status === "validating") {
    if (!refreshIntervalId) {
      refreshIntervalId = setInterval(async () => {
        await doRefresh();
      }, 9000);
    }
  } else {
    clearInterval(refreshIntervalId);
    refreshIntervalId = null;
  }
}

watch(
  () => props.domain,
  async value => {
    await doRefresh();
  },
  {
    immediate: true,
  }
);

const loading = ref(false);
async function doVerify() {
  if (!cnameRecord.value || !cnameRecord.value.id) {
    return;
  }
  loading.value = true;
  try {
    await api.DoVerify(cnameRecord.value.id);
  } finally {
    loading.value = false;
  }
  await doRefresh();
}

async function resetStatus() {
  Modal.confirm({
    title: "重置状态",
    content: "确定要重置校验状态吗？",
    onOk: async () => {
      await api.ResetStatus(cnameRecord.value.id);
      await loadRecord();
    },
  });
}
</script>

<style lang="less">
.cname-record-info {
  .fs-copyable {
    width: 100%;
  }
}
</style>
