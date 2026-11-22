<template>
  <a-modal v-model:open="visible" :title="`${t('certd.localCa.viewTitle')} - ${row?.name || ''}`" width="900px">
    <div v-if="row" class="local-ca-view">
      <a-descriptions class="local-ca-settings" bordered :column="1" size="small">
        <a-descriptions-item :label="t('certd.localCa.fields.name')">{{ row.name }}</a-descriptions-item>
        <a-descriptions-item :label="t('certd.localCa.fields.caType')">
          {{ row.caType === "intermediate" ? t("certd.localCa.caTypeIntermediate") : t("certd.localCa.caTypeRoot") }}
        </a-descriptions-item>
        <a-descriptions-item v-if="row.parentName" :label="t('certd.localCa.fields.parentCa')">{{ row.parentName }}</a-descriptions-item>
        <a-descriptions-item :label="t('certd.localCa.fields.subjectCn')">{{ row.subjectCn }}</a-descriptions-item>
        <a-descriptions-item :label="t('certd.localCa.fields.organization')">{{ subject.O || "-" }}</a-descriptions-item>
        <a-descriptions-item :label="t('certd.localCa.fields.organizationUnit')">{{ subject.OU || "-" }}</a-descriptions-item>
        <a-descriptions-item :label="t('certd.localCa.fields.country')">{{ subject.C || "-" }}</a-descriptions-item>
        <a-descriptions-item :label="t('certd.localCa.fields.state')">{{ subject.ST || "-" }}</a-descriptions-item>
        <a-descriptions-item :label="t('certd.localCa.fields.locality')">{{ subject.L || "-" }}</a-descriptions-item>
        <a-descriptions-item :label="t('certd.localCa.fields.source')">{{ sourceLabel }}</a-descriptions-item>
        <a-descriptions-item :label="t('certd.localCa.fields.keyType')">{{ keyTypeLabel }}</a-descriptions-item>
        <a-descriptions-item :label="t('certd.localCa.fields.usage')">{{ usageLabel }}</a-descriptions-item>
        <a-descriptions-item :label="t('certd.localCa.fields.allowedDomains')">{{ allowedDomains.length ? allowedDomains.join(", ") : t("certd.localCa.unlimited") }}</a-descriptions-item>
        <a-descriptions-item :label="t('certd.localCa.fields.maxValidityDays')">
          {{ row.maxValidityDays ? `${row.maxValidityDays} ${t("certd.localCa.days")}` : t("certd.localCa.unlimited") }}
        </a-descriptions-item>
        <a-descriptions-item :label="t('certd.localCa.fields.notAfter')">{{ formatTime(row.notAfter) }}</a-descriptions-item>
        <a-descriptions-item :label="t('certd.localCa.fields.fingerprint')">{{ row.fingerprintSha256 }}</a-descriptions-item>
        <a-descriptions-item :label="t('certd.localCa.fields.remark')">{{ row.remark || "-" }}</a-descriptions-item>
      </a-descriptions>
      <a-divider />
      <CertView v-if="cert" :cert="cert" />
    </div>
    <template #footer>
      <a-button :loading="publicKeyLoading" @click="downloadPublicKey">{{ t("certd.localCa.downloadPublicKey") }}</a-button>
      <a-button @click="props.onExport?.(row)">{{ t("certd.localCa.export") }}</a-button>
      <a-button @click="openCrl">{{ t("certd.localCa.viewCrl") }}</a-button>
      <a-button type="primary" @click="visible = false">{{ t("certd.common.close") }}</a-button>
    </template>
  </a-modal>

  <a-modal v-model:open="crlVisible" :title="t('certd.localCa.viewCrl')" width="860px">
    <a-descriptions bordered :column="2" size="small">
      <a-descriptions-item :label="t('certd.localCa.crlIssuer')" :span="2">{{ crlInfo?.issuer || "-" }}</a-descriptions-item>
      <a-descriptions-item :label="t('certd.localCa.crlThisUpdate')">{{ formatTime(crlInfo?.thisUpdate) }}</a-descriptions-item>
      <a-descriptions-item :label="t('certd.localCa.crlNextUpdate')">{{ formatTime(crlInfo?.nextUpdate) }}</a-descriptions-item>
      <a-descriptions-item :label="t('certd.localCa.crlCount')" :span="2">{{ crlInfo?.entries?.length || 0 }}</a-descriptions-item>
    </a-descriptions>
    <a-table :data-source="crlInfo?.entries || []" :pagination="{ pageSize: 8 }" size="small" class="mt-3" row-key="serialNumber">
      <a-table-column :title="t('certd.localCa.certSerial')" data-index="serialNumber" />
      <a-table-column :title="t('certd.localCa.crlRevokedAt')">
        <template #default="{ record }">{{ formatTime(record.revocationDate) }}</template>
      </a-table-column>
    </a-table>
    <template #footer>
      <a-button @click="downloadCrl">{{ t("certd.localCa.downloadCrl") }}</a-button>
      <a-button type="primary" @click="crlVisible = false">{{ t("certd.common.close") }}</a-button>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { notification } from "ant-design-vue";
import dayjs from "dayjs";
import { useI18n } from "/src/locales";
import CertView from "/@/views/certd/pipeline/cert-view.vue";
import { env } from "/@/utils/util.env";
import { localCaApi } from "./api";

defineOptions({
  name: "LocalCaView",
});

const props = defineProps<{
  onExport?: (row: any) => void;
}>();

const { t } = useI18n();
const visible = ref(false);
const crlVisible = ref(false);
const row = ref<any>(null);
const cert = ref<any>(null);
const crlInfo = ref<any>(null);
const publicKeyLoading = ref(false);

const subject = computed(() => parseJson(row.value?.subject, {}));
const allowedDomains = computed(() => parseJson(row.value?.allowedDomains, []));
const sourceLabel = computed(() => (row.value?.source === "imported" ? t("certd.localCa.source.imported") : t("certd.localCa.source.generated")));
const usageLabel = computed(() => {
  if (row.value?.usage === "client") return t("certd.localCa.usage.client");
  if (row.value?.usage === "both") return t("certd.localCa.usage.both");
  return t("certd.localCa.usage.server");
});
const keyTypeLabel = computed(() => {
  const map: any = {
    rsa2048: "RSA 2048",
    rsa3072: "RSA 3072",
    rsa4096: "RSA 4096",
    ecdsa256: "ECDSA P-256",
    ecdsa384: "ECDSA P-384",
  };
  return map[row.value?.keyType] || row.value?.keyType || "-";
});

function parseJson(value: any, fallback: any) {
  if (!value) return fallback;
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch (e) {
    return fallback;
  }
}

function formatTime(value: any) {
  if (!value) return "-";
  return dayjs(Number(value) || value).format("YYYY-MM-DD HH:mm:ss");
}

async function open(data: any) {
  row.value = data;
  cert.value = null;
  crlInfo.value = null;
  visible.value = true;
  try {
    const res = await localCaApi.GetCertDetail(data.certPem);
    cert.value = {
      crt: data.certPem,
      key: "",
      ic: "",
      detail: res.detail,
    };
  } catch (e: any) {
    notification.error({ message: e.message || t("certd.localCa.viewFailed") });
  }
}

async function downloadPublicKey() {
  publicKeyLoading.value = true;
  try {
    const res = await localCaApi.GetPublicKey(row.value.id);
    downloadBlob(res.pem, res.filename);
  } finally {
    publicKeyLoading.value = false;
  }
}

async function openCrl() {
  crlInfo.value = await localCaApi.GetCrlInfo(row.value.id);
  crlVisible.value = true;
}

function downloadCrl() {
  window.open(`${env.API}/cert/local-ca/crl?id=${row.value.id}&format=pem`);
}

function downloadBlob(content: string, filename: string) {
  const blob = new Blob([content], { type: "application/x-pem-file" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

defineExpose({ open });
</script>

<style lang="less">
.local-ca-view {
  .local-ca-settings {
    width: 100%;
    table-layout: fixed;
    .ant-descriptions-item-content {
      word-break: break-all;
      overflow-wrap: anywhere;
    }
  }
}
</style>
