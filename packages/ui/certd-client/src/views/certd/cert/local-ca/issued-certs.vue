<template>
  <div>
    <a-alert type="info" show-icon class="mb-3" :message="t('certd.localCa.issuedCertsHint')" />
    <a-table :data-source="list" :columns="columns" :loading="loading" :pagination="{ pageSize: 10 }" size="small" row-key="id">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'domain'">
          <a-tag color="blue">{{ record.domain }}</a-tag>
        </template>
        <template v-else-if="column.key === 'serialNumber'">
          <fs-copyable :model-value="record.serialNumber || '-'"></fs-copyable>
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
        </template>
        <template v-else-if="column.key === 'expiresTime'">
          {{ formatTime(record.expiresTime) }}
        </template>
        <template v-else-if="column.key === 'applyTime'">
          {{ formatTime(record.applyTime) }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-button type="link" size="small" @click="viewCert(record)">{{ t("certd.localCa.certView") }}</a-button>
          <a-button type="link" size="small" danger :disabled="record.status === 'revoked'" @click="revokeCert(record)">
            {{ t("certd.localCa.revoke") }}
          </a-button>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="tsx">
import { onMounted, ref } from "vue";
import { Modal, notification } from "ant-design-vue";
import dayjs from "dayjs";
import { useI18n } from "/src/locales";
import { useModal } from "/@/use/use-modal";
import CertView from "/@/views/certd/pipeline/cert-view.vue";
import { certInfoApi } from "/@/views/certd/monitor/cert/api";
import { localCaApi } from "./api";

defineOptions({
  name: "LocalCaIssuedCerts",
});

const props = defineProps<{
  caId: number;
}>();

const { t } = useI18n();
const model = useModal();
const list = ref<any[]>([]);
const loading = ref(false);

const columns = [
  { title: t("certd.localCa.certDomain"), dataIndex: "domain", key: "domain", width: 180 },
  { title: t("certd.localCa.certSerial"), dataIndex: "serialNumber", key: "serialNumber", width: 240 },
  { title: t("certd.localCa.certStatus"), dataIndex: "status", key: "status", width: 100 },
  { title: t("certd.localCa.certExpires"), dataIndex: "expiresTime", key: "expiresTime", width: 170 },
  { title: t("certd.localCa.certApplyTime"), dataIndex: "applyTime", key: "applyTime", width: 170 },
  { title: t("certd.localCa.certActions"), key: "actions", width: 150 },
];

async function load() {
  loading.value = true;
  try {
    list.value = await localCaApi.ListCerts(props.caId);
  } finally {
    loading.value = false;
  }
}

function statusLabel(status: string) {
  if (status === "inactive") {
    return t("certd.localCa.certStatusInactive");
  }
  if (status === "revoked") {
    return t("certd.localCa.certStatusRevoked");
  }
  return t("certd.localCa.certStatusActive");
}

function statusColor(status: string) {
  if (status === "inactive") {
    return "orange";
  }
  if (status === "revoked") {
    return "red";
  }
  return "green";
}

function formatTime(value: any) {
  if (!value) {
    return "-";
  }
  return dayjs(Number(value) || value).format("YYYY-MM-DD HH:mm:ss");
}

async function viewCert(record: any) {
  const cert = await certInfoApi.GetCert(record.id);
  if (!cert) {
    notification.error({ message: t("certd.localCa.certNotFound") });
    return;
  }
  model.success({
    title: t("certd.localCa.viewTitle"),
    maskClosable: true,
    okText: t("certd.common.confirm"),
    width: 800,
    content: () => <CertView cert={cert} />,
  });
}

function revokeCert(record: any) {
  Modal.confirm({
    title: t("certd.localCa.revokeConfirmTitle"),
    content: t("certd.localCa.revokeConfirmContent", { domain: record.domain }),
    okText: t("certd.localCa.revoke"),
    cancelText: t("certd.common.cancel"),
    okButtonProps: { danger: true },
    async onOk() {
      await localCaApi.RevokeCert(props.caId, record.id);
      notification.success({ message: t("certd.localCa.revokeSuccess") });
      await load();
    },
  });
}

onMounted(load);
</script>
