<template>
  <div class="local-ca-tab-issued-certs">
    <CaSelect v-model="caId" @change="onCaChange" />
    <a-alert type="info" show-icon class="mb-3" :message="t('certd.localCa.issuedCertsHint')" />
    <div class="issued-certs-filters">
      <a-input v-model:value="keyword" allow-clear class="issued-certs-keyword" :placeholder="t('certd.localCa.certKeywordPlaceholder')" />
      <a-select v-model:value="statusFilter" class="issued-certs-status" :options="statusOptions" />
    </div>
    <a-table :data-source="groups" :loading="loading" :pagination="{ pageSize: 20, showSizeChanger: true }" row-key="key" size="small" :expand-row-by-click="true">
      <a-table-column :title="t('certd.localCa.certType')" :width="110">
        <template #default="{ record }">
          <a-tag :color="record.type === 'ca' ? 'purple' : 'blue'">{{ record.type === "ca" ? t("certd.localCa.certTypeCa") : t("certd.localCa.certTypeLeaf") }}</a-tag>
        </template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.certDomain')" :width="260" ellipsis>
        <template #default="{ record }">{{ record.domainsText }}</template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.certIssuedBy')" :width="160" ellipsis>
        <template #default="{ record }">{{ record.caName || "-" }}</template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.certGroupCount')" :width="90" align="center">
        <template #default="{ record }">{{ record.items.length }}</template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.certStatus')" :width="200">
        <template #default="{ record }">
          <a-tag v-if="record.activeCount" color="green">{{ t("certd.localCa.certStatusActive") }} {{ record.activeCount }}</a-tag>
          <a-tag v-if="record.expiredCount" color="orange">{{ t("certd.localCa.certStatusExpired") }} {{ record.expiredCount }}</a-tag>
          <a-tag v-if="record.revokedCount" color="red">{{ t("certd.localCa.certStatusRevoked") }} {{ record.revokedCount }}</a-tag>
        </template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.certApplyTime')" :width="170">
        <template #default="{ record }">{{ formatTime(record.latestApply) }}</template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.certExpires')" :width="170">
        <template #default="{ record }">{{ formatTime(record.latestExpires) }}</template>
      </a-table-column>
      <template #expandedRowRender="{ record }">
        <a-table :data-source="record.items" :pagination="false" row-key="rowKey" size="small">
          <a-table-column :title="t('certd.localCa.certSerial')" :width="240">
            <template #default="{ record: item }"><fs-copyable :model-value="item.serialNumber || '-'" /></template>
          </a-table-column>
          <a-table-column :title="t('certd.localCa.certStatus')" :width="100">
            <template #default="{ record: item }">
              <a-tag :color="statusColor(item)">{{ statusLabel(item) }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="t('certd.localCa.certIssueMethod')" :width="110">
            <template #default="{ record: item }">
              <a-tag v-if="item.type !== 'ca'" :color="item.fromType === 'acme' ? 'geekblue' : 'cyan'">{{ item.fromType === "acme" ? t("certd.localCa.certIssueAcme") : t("certd.localCa.certIssueDirect") }}</a-tag>
              <span v-else>-</span>
            </template>
          </a-table-column>
          <a-table-column :title="t('certd.localCa.certIssuedBy')" :width="160" ellipsis>
            <template #default="{ record: item }">{{ item.caName || "-" }}</template>
          </a-table-column>
          <a-table-column :title="t('certd.localCa.certOwner')" :width="160" ellipsis>
            <template #default="{ record: item }">{{ ownerLabel(item) }}</template>
          </a-table-column>
          <a-table-column :title="t('certd.localCa.certApplyTime')" :width="170">
            <template #default="{ record: item }">{{ formatTime(item.applyTime) }}</template>
          </a-table-column>
          <a-table-column :title="t('certd.localCa.certExpires')" :width="170">
            <template #default="{ record: item }">{{ formatTime(item.expiresTime) }}</template>
          </a-table-column>
          <a-table-column :title="t('certd.localCa.certActions')" :width="120">
            <template #default="{ record: item }">
              <div class="local-ca-row-actions">
                <a-button type="link" size="small" @click="viewCert(item)">{{ t("certd.localCa.certView") }}</a-button>
                <a-button v-if="item.status !== 'revoked'" type="link" size="small" danger @click="revokeCert(item)">{{ t("certd.localCa.revoke") }}</a-button>
              </div>
            </template>
          </a-table-column>
        </a-table>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="tsx">
import { computed, nextTick, ref } from "vue";
import { Modal, notification } from "ant-design-vue";
import dayjs from "dayjs";
import { useI18n } from "/src/locales";
import { request } from "/@/api/service";
import { useModal } from "/@/use/use-modal";
import CertView from "/@/views/certd/pipeline/cert-view.vue";
import CaSelect from "../components/ca-select.vue";
import { useStepUp } from "../use-step-up";
import { localCaApi } from "../api";

defineOptions({ name: "LocalCaTabIssuedCerts" });

const { t } = useI18n();
const model = useModal();
const { openStepUp } = useStepUp();
const caId = ref<number | undefined>();
const keyword = ref("");
const statusFilter = ref("all");
const loading = ref(false);
const certs = ref<any[]>([]);
const users = ref<any[]>([]);
const projects = ref<any[]>([]);

const statusOptions = computed(() => [
  { label: t("certd.localCa.certFilterAll"), value: "all" },
  { label: t("certd.localCa.certStatusActive"), value: "active" },
  { label: t("certd.localCa.certStatusExpired"), value: "expired" },
  { label: t("certd.localCa.certStatusRevoked"), value: "revoked" },
]);

function isExpired(item: any) {
  return item.status !== "revoked" && item.expiresTime && Number(item.expiresTime) <= Date.now();
}
function bucket(item: any) {
  if (item.status === "revoked") {
    return "revoked";
  }
  if (isExpired(item)) {
    return "expired";
  }
  return "active";
}
function statusLabel(item: any) {
  const b = bucket(item);
  if (b === "revoked") {
    return t("certd.localCa.certStatusRevoked");
  }
  if (b === "expired") {
    return t("certd.localCa.certStatusExpired");
  }
  return item.status === "inactive" ? t("certd.localCa.certStatusInactive") : t("certd.localCa.certStatusActive");
}
function statusColor(item: any) {
  const b = bucket(item);
  if (b === "revoked") {
    return "red";
  }
  if (b === "expired") {
    return "orange";
  }
  return item.status === "inactive" ? "orange" : "green";
}
function formatTime(value: any) {
  if (!value) {
    return "-";
  }
  return dayjs(Number(value) || value).format("YYYY-MM-DD HH:mm:ss");
}
function ownerLabel(item: any) {
  if (!(Number(item.userId) > 0)) {
    return t("certd.localCa.systemLevelTag");
  }
  const user = users.value.find(u => Number(u.id) === Number(item.userId));
  const name = user ? user.nickName || user.username : `#${item.userId}`;
  if (item.projectId) {
    const project = projects.value.find(p => Number(p.id) === Number(item.projectId));
    return `${name} / ${project ? project.name : `#${item.projectId}`}`;
  }
  return name;
}

// 按签发域名集合完全一致合并分组，组内按签发时间倒序
const groups = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  const result: any[] = [];
  const leafMap = new Map<string, any>();
  for (const item of certs.value) {
    const matchKw =
      !kw ||
      String(item.domain || "")
        .toLowerCase()
        .includes(kw) ||
      String(item.domains || "")
        .toLowerCase()
        .includes(kw) ||
      String(item.serialNumber || "")
        .toLowerCase()
        .includes(kw);
    if (!matchKw) {
      continue;
    }
    if (statusFilter.value !== "all" && bucket(item) !== statusFilter.value) {
      continue;
    }
    if (item.type === "ca") {
      const b = bucket(item);
      result.push({
        key: `ca-${item.id}`,
        type: "ca",
        caName: item.caName || item.domain,
        domainsText: item.domain,
        items: [{ ...item, rowKey: `ca-${item.id}` }],
        activeCount: b === "active" ? 1 : 0,
        expiredCount: b === "expired" ? 1 : 0,
        revokedCount: b === "revoked" ? 1 : 0,
        latestApply: Number(item.applyTime) || 0,
        latestExpires: Number(item.expiresTime) || 0,
      });
      continue;
    }
    const domainList = String(item.domains || item.domain || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
      .sort();
    const key = domainList.join("|");
    if (!leafMap.has(key)) {
      leafMap.set(key, {
        key: `leaf-${key}`,
        type: "leaf",
        caName: null as string | null,
        domainsText: domainList.join(", "),
        items: [],
        activeCount: 0,
        expiredCount: 0,
        revokedCount: 0,
        latestApply: 0,
        latestExpires: 0,
      });
    }
    const group = leafMap.get(key);
    group.items.push({ ...item, rowKey: `leaf-${item.id}` });
    if (!group.caName) {
      group.caName = item.caName || null;
    }
    const b = bucket(item);
    if (b === "active") {
      group.activeCount++;
    } else if (b === "expired") {
      group.expiredCount++;
    } else {
      group.revokedCount++;
    }
    group.latestApply = Math.max(group.latestApply, Number(item.applyTime) || 0);
    group.latestExpires = Math.max(group.latestExpires, Number(item.expiresTime) || 0);
  }
  const leafGroups = [...leafMap.values()];
  for (const group of leafGroups) {
    group.items.sort((a: any, b: any) => (Number(b.applyTime) || 0) - (Number(a.applyTime) || 0));
  }
  leafGroups.sort((a, b) => b.latestApply - a.latestApply);
  return [...result, ...leafGroups];
});

async function loadMeta() {
  try {
    users.value = (await request({ url: "/sys/authority/user/getSimpleUsers", method: "POST" })) || [];
  } catch {
    users.value = [];
  }
  try {
    const res: any = await request({ url: "/sys/enterprise/project/page", method: "post", data: { page: { current: 1, size: 1000 } } });
    projects.value = res?.records || [];
  } catch {
    projects.value = [];
  }
}

async function reload() {
  if (!caId.value) {
    certs.value = [];
    return;
  }
  loading.value = true;
  try {
    certs.value = (await localCaApi.ListCerts(caId.value)) || [];
  } catch (e: any) {
    notification.error({ message: String(e?.message || e) });
    certs.value = [];
  } finally {
    loading.value = false;
  }
}

async function onCaChange() {
  await nextTick();
  await loadMeta();
  await reload();
}

async function viewCert(item: any) {
  let cert: any;
  if (item.type === "ca") {
    const ca = await localCaApi.GetObj(item.id);
    const res = await localCaApi.GetCertDetail(ca.certPem);
    cert = { crt: ca.certPem, key: "", ic: "", detail: res.detail };
  } else {
    if (!item.crt) {
      notification.error({ message: t("certd.localCa.certNotFound") });
      return;
    }
    const res = await localCaApi.GetCertDetail(item.crt);
    cert = { crt: item.crt, key: "", ic: "", detail: res.detail };
  }
  model.success({
    title: t("certd.localCa.viewTitle"),
    maskClosable: true,
    okText: t("certd.common.confirm"),
    width: 800,
    zIndex: 1200,
    content: () => <CertView cert={cert} />,
  });
}

function revokeCert(item: any) {
  Modal.confirm({
    title: t("certd.localCa.revokeConfirmTitle"),
    content: t("certd.localCa.revokeConfirmContent", { domain: item.domain }),
    okText: t("certd.localCa.revoke"),
    cancelText: t("certd.common.cancel"),
    okButtonProps: { danger: true },
    async onOk() {
      await openStepUp(t("certd.localCa.revokeCertStepUpTitle"), t("certd.localCa.revokeCertStepUpDesc"), async () => {
        await localCaApi.RevokeCert(caId.value as number, item.id);
        notification.success({ message: t("certd.localCa.revokeSuccess") });
        await reload();
      });
    },
  });
}
</script>

<style lang="less">
.local-ca-tab-issued-certs {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: auto;

  .issued-certs-filters {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }
  .issued-certs-keyword {
    width: 280px;
  }
  .issued-certs-status {
    width: 140px;
  }
}
</style>
