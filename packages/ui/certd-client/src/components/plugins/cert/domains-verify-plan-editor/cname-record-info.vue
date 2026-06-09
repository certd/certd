<template>
  <tbody v-if="cnameRecord" class="cname-record-info">
    <tr>
      <!--    <td class="domain">-->
      <!--      {{ props.domain }}-->
      <!--    </td>-->
      <td class="host-record" :title="t('certd.verifyPlan.domainTitle', { domain: props.domain })">
        <fs-copyable v-model="cnameRecord.hostRecord"></fs-copyable>
      </td>
      <td style="text-align: center">CNAME</td>
      <td class="record-value" :title="cnameRecord.recordValue">
        <fs-copyable v-model="cnameRecord.recordValue"></fs-copyable>
      </td>
      <td class="status center">
        <span class="status-content">
          <fs-values-format v-model="cnameRecord.status" :dict="statusDict" />
          <a-tooltip v-if="cnameRecord.error" :title="cnameRecord.error">
            <fs-icon class="ml-5 color-red" icon="ion:warning-outline"></fs-icon>
          </a-tooltip>
          <a-tooltip v-if="cnameRecord.status === 'valid'" :title="t('certd.verifyPlan.resetStatusTooltip')">
            <fs-icon class="ml-2 color-yellow text-md pointer" icon="solar:undo-left-square-bold" @click="resetStatus"></fs-icon>
          </a-tooltip>
        </span>
      </td>
      <td class="center">
        <template v-if="cnameRecord.status !== 'valid'">
          <a-button type="primary" size="small" :loading="loading" @click="doVerify">{{ t("certd.verifyPlan.clickToValidate") }}</a-button>
          <cname-tip :record="cnameRecord"></cname-tip>
        </template>

        <div v-else class="helper" :title="t('certd.verifyPlan.keepCnameTitle')">{{ t("certd.verifyPlan.keepCname") }}</div>
      </td>
    </tr>
  </tbody>
</template>

<script lang="ts" setup>
import { CnameRecord, GetByDomain } from "/@/components/plugins/cert/domains-verify-plan-editor/api";
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { dict } from "@fast-crud/fast-crud";
import * as api from "./api.js";
import CnameTip from "./cname-tip.vue";
import { Modal } from "ant-design-vue";
import { utils } from "/@/utils/index.js";
const { t } = useI18n();
const statusDict = dict({
  data: [
    { label: t("certd.verifyPlan.status.pendingCname"), value: "cname", color: "warning" },
    { label: t("certd.verifyPlan.status.validating"), value: "validating", color: "blue" },
    { label: t("certd.verifyPlan.status.valid"), value: "valid", color: "green" },
    { label: t("certd.verifyPlan.status.failed"), value: "failed", color: "red" },
    { label: t("certd.verifyPlan.status.timeout"), value: "timeout", color: "red" },
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
    title: t("certd.verifyPlan.resetStatus"),
    content: t("certd.verifyPlan.confirmResetStatus"),
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
  .status-content {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
