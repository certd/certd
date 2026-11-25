<template>
  <a-modal v-model:open="visible" :title="`${t('certd.localCa.viewTitle')} - ${row?.name || ''}`" width="900px">
    <div v-if="row" class="local-ca-view">
      <a-tabs v-model:active-key="activeTab">
        <a-tab-pane key="settings" :tab="t('certd.localCa.tabSettings')">
          <a-alert
            v-if="row.caType === 'intermediate' && !row.acmeEnabled && !row.deleted"
            type="warning"
            show-icon
            class="mb-3"
            :message="t('certd.localCa.acmeDisabledTitle')"
            :description="t('certd.localCa.acmeDisabledDesc')"
          >
            <template #action>
              <a-button size="small" type="primary" :loading="acmeEnabling" @click="enableAcme">{{ t("certd.localCa.enableAcme") }}</a-button>
            </template>
          </a-alert>
          <a-descriptions class="local-ca-settings" bordered :column="2" size="small">
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
            <a-descriptions-item :label="t('certd.localCa.fields.baseUrl')" :span="2">{{ baseUrl }}</a-descriptions-item>
            <a-descriptions-item :label="t('certd.localCa.fields.notAfter')">{{ formatTime(row.notAfter) }}</a-descriptions-item>
            <a-descriptions-item :label="t('certd.localCa.fields.fingerprint')">{{ row.fingerprintSha256 }}</a-descriptions-item>
            <a-descriptions-item v-if="row.caType === 'intermediate' && !row.deleted" :label="t('certd.localCa.fields.acmeEnabled')">
              {{ acmeStateLabel }}
            </a-descriptions-item>
            <a-descriptions-item v-if="row.acmeEnabled && !row.deleted" :label="t('certd.localCa.acmeDirectory')" :span="2">
              <fs-copyable :model-value="acmeDirectoryUrl">{{ acmeDirectoryUrl }}</fs-copyable>
            </a-descriptions-item>
            <a-descriptions-item :label="t('certd.localCa.fields.exportDisabled')">
              {{ row.exportDisabled ? t("certd.localCa.exportDisabledYes") : t("certd.localCa.exportDisabledNo") }}
            </a-descriptions-item>
            <a-descriptions-item :label="t('certd.localCa.fields.remark')">{{ row.remark || "-" }}</a-descriptions-item>
          </a-descriptions>
        </a-tab-pane>
        <a-tab-pane key="cert" :tab="t('certd.localCa.tabCert')">
          <CertView v-if="cert" :cert="cert" />
        </a-tab-pane>
      </a-tabs>
    </div>
    <template #footer>
      <a-button :loading="publicKeyLoading" @click="downloadPublicKey">{{ t("certd.localCa.downloadPublicKey") }}</a-button>
      <a-button :disabled="row?.exportDisabled" @click="props.onExport?.(row)">{{ t("certd.localCa.export") }}</a-button>
      <a-button @click="openCrl">{{ t("certd.localCa.viewCrl") }}</a-button>
      <a-button v-if="row?.caType === 'intermediate' && row?.acmeEnabled && !row?.deleted" @click="acmeHelpVisible = true">{{ t("certd.localCa.acmeAccess") }}</a-button>
      <a-button type="primary" @click="visible = false">{{ t("certd.common.close") }}</a-button>
    </template>
  </a-modal>

  <a-modal v-model:open="crlVisible" :title="t('certd.localCa.viewCrl')" width="860px">
    <a-descriptions bordered :column="2" size="small">
      <a-descriptions-item :label="t('certd.localCa.crlIssuer')" :span="2">{{ crlInfo?.issuer || "-" }}</a-descriptions-item>
      <a-descriptions-item :label="t('certd.localCa.crlThisUpdate')">{{ formatTime(crlInfo?.thisUpdate) }}</a-descriptions-item>
      <a-descriptions-item :label="t('certd.localCa.crlNextUpdate')">{{ formatTime(crlInfo?.nextUpdate) }}</a-descriptions-item>
      <a-descriptions-item :label="t('certd.localCa.crlCount')">{{ crlInfo?.entries?.length || 0 }}</a-descriptions-item>
      <a-descriptions-item :label="t('certd.localCa.crlNumber')">{{ crlInfo?.crlNumber || "-" }}</a-descriptions-item>
    </a-descriptions>
    <a-table :data-source="crlInfo?.entries || []" :pagination="{ pageSize: 8 }" size="small" class="mt-3" row-key="serialNumber">
      <a-table-column :title="t('certd.localCa.certSerial')">
        <template #default="{ record }">{{ String(record.serialNumber || "").toUpperCase() }}</template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.crlRevokedAt')">
        <template #default="{ record }">{{ formatTime(record.revocationDate) }}</template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.crlReason')">
        <template #default="{ record }">{{ reasonLabel(record.reason) }}</template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.accessActions')" :width="120" align="center">
        <template #default="{ record }">
          <a-button type="link" size="small" @click="viewCrlCert(record)">{{ t("certd.localCa.viewCertInfo") }}</a-button>
        </template>
      </a-table-column>
    </a-table>
    <template #footer>
      <a-button @click="downloadCrl">{{ t("certd.localCa.downloadCrl") }}</a-button>
      <a-button type="primary" @click="crlVisible = false">{{ t("certd.common.close") }}</a-button>
    </template>
  </a-modal>

  <a-modal v-model:open="acmeHelpVisible" :title="t('certd.localCa.acmeConnectTitle')" width="860px">
    <a-alert type="info" show-icon :message="t('certd.localCa.acmeConnectHint')" class="mb-3" />
    <a-descriptions bordered :column="1" size="small">
      <a-descriptions-item :label="t('certd.localCa.acmeDirectory')">
        <fs-copyable :model-value="acmeDirectoryUrl">{{ acmeDirectoryUrl }}</fs-copyable>
      </a-descriptions-item>
    </a-descriptions>
    <a-tabs class="mt-3">
      <a-tab-pane key="client" :tab="t('certd.localCa.acmeClientTab')">
        <div class="acme-help-text" v-html="t('certd.localCa.acmeClientHelp')"></div>
        <pre class="acme-code">{{ certbotExample }}</pre>
        <pre class="acme-code">{{ acmeShExample }}</pre>
      </a-tab-pane>
      <a-tab-pane key="certd" :tab="t('certd.localCa.acmeCertdTab')">
        <div class="acme-help-text" v-html="t('certd.localCa.acmeCertdHelp')"></div>
      </a-tab-pane>
    </a-tabs>
    <template #footer>
      <a-button type="primary" @click="acmeHelpVisible = false">{{ t("certd.common.close") }}</a-button>
    </template>
  </a-modal>
</template>

<script setup lang="tsx">
import { computed, ref } from "vue";
import { notification } from "ant-design-vue";
import dayjs from "dayjs";
import { useI18n } from "/src/locales";
import { useModal } from "/@/use/use-modal";
import CertView from "/@/views/certd/pipeline/cert-view.vue";
import { localCaApi } from "./api";

defineOptions({
  name: "LocalCaView",
});

const props = defineProps<{
  onExport?: (row: any) => void;
  onAcmeEnable?: (row: any) => Promise<boolean>;
  onChanged?: () => void;
}>();

const { t } = useI18n();
const model = useModal();
async function viewCrlCert(record: any) {
  try {
    const res = await localCaApi.GetCertBySerial(row.value.id, record.serialNumber);
    if (!res?.certPem) {
      notification.warning({ message: t("certd.localCa.certNotFound") });
      return;
    }
    const detail = await localCaApi.GetCertDetail(res.certPem);
    model.success({
      title: t("certd.localCa.viewTitle"),
      maskClosable: true,
      okText: t("certd.common.confirm"),
      width: 800,
      content: () => <CertView cert={{ crt: res.certPem, key: "", ic: "", detail: detail.detail }} />,
    });
  } catch (e: any) {
    notification.error({ message: e?.message || t("certd.localCa.viewFailed") });
  }
}
const visible = ref(false);
const activeTab = ref("settings");
const crlVisible = ref(false);
const acmeHelpVisible = ref(false);
const row = ref<any>(null);
const cert = ref<any>(null);
const crlInfo = ref<any>(null);
const publicKeyLoading = ref(false);
const acmeEnabling = ref(false);

const subject = computed(() => parseJson(row.value?.subject, {}));
const allowedDomains = computed(() => parseJson(row.value?.allowedDomains, []));
const sourceLabel = computed(() => (row.value?.source === "imported" ? t("certd.localCa.source.imported") : t("certd.localCa.source.generated")));
const usageLabel = computed(() => {
  if (row.value?.usage === "client") return t("certd.localCa.usage.client");
  if (row.value?.usage === "both") return t("certd.localCa.usage.both");
  return t("certd.localCa.usage.server");
});
const baseUrl = computed(() => row.value?.effectiveBaseUrl || row.value?.baseUrl || window.location.origin);
const acmeStateLabel = computed(() => {
  if (!row.value?.acmeEnabled) {
    return t("certd.localCa.acmeStateOff");
  }
  if (row.value?.acmeMode === "local") {
    return t("certd.localCa.acmeStateLocal");
  }
  return t("certd.localCa.acmeStateStandard");
});
const acmeDirectoryUrl = computed(() => (row.value ? `${baseUrl.value}/api/acme/${row.value.id}/directory` : ""));
const certbotExample = computed(() => `certbot certonly --server ${acmeDirectoryUrl.value} --eab-kid <EAB_KID> --eab-hmac-key <EAB_HMAC> --standalone -d your.example.com`);
const acmeShExample = computed(() => `acme.sh --server ${acmeDirectoryUrl.value} --eab-kid <EAB_KID> --eab-hmac-key <EAB_HMAC> --issue -d your.example.com --webroot /var/www/html`);
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

function reasonLabel(reason: any) {
  const map: any = {
    0: t("certd.localCa.crlReasonUnspecified"),
    1: t("certd.localCa.crlReasonKeyCompromise"),
    2: t("certd.localCa.crlReasonCaCompromise"),
    3: t("certd.localCa.crlReasonAffiliationChanged"),
    4: t("certd.localCa.crlReasonSuperseded"),
    5: t("certd.localCa.crlReasonCessation"),
  };
  return map[reason] || t("certd.localCa.crlReasonUnspecified");
}

function formatTime(value: any) {
  if (!value) return "-";
  return dayjs(Number(value) || value).format("YYYY-MM-DD HH:mm:ss");
}

async function open(data: any) {
  row.value = data;
  activeTab.value = "settings";
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

async function enableAcme() {
  acmeEnabling.value = true;
  try {
    const verified = props.onAcmeEnable ? await props.onAcmeEnable(row.value) : (await localCaApi.EnableAcme(row.value.id, true, undefined, "local"), true);
    if (!verified) {
      return;
    }
    row.value.acmeEnabled = true;
    row.value.acmeMode = "local";
    notification.success({ message: t("certd.localCa.acmeChanged") });
    props.onChanged?.();
  } finally {
    acmeEnabling.value = false;
  }
}

async function downloadPublicKey() {
  publicKeyLoading.value = true;
  try {
    const res = await localCaApi.GetPublicKey(row.value.id);
    downloadBlob(res.pem, res.filename);
  } catch (e: any) {
    notification.error({ message: String(e?.message || e) });
  } finally {
    publicKeyLoading.value = false;
  }
}

async function openCrl() {
  try {
    crlInfo.value = await localCaApi.GetCrlInfo(row.value.id);
    crlVisible.value = true;
  } catch (e: any) {
    notification.error({ message: String(e?.message || e) });
  }
}

function downloadCrl() {
  window.open(`${baseUrl.value}/api/sys/local-ca/crl?id=${row.value.id}&format=pem`);
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

/* 弹窗会被 teleport 到 body，代码块样式不能嵌套在 .local-ca-view 下 */
.acme-code {
  max-width: 100%;
  overflow-x: auto;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 4px;
  padding: 10px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-all;
}

.acme-help-text {
  line-height: 1.8;
  overflow-wrap: anywhere;
  word-break: break-word;
}
</style>
