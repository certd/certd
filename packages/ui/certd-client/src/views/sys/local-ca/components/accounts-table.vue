<template>
  <div class="local-ca-accounts-table">
    <a-alert type="info" show-icon class="mb-3" :message="t('certd.localCa.acmeAccountsHint')" />
    <a-table :data-source="accounts" :loading="loading" :pagination="{ pageSize: 20, showSizeChanger: true }" row-key="id" size="small">
      <a-table-column :title="t('certd.localCa.acmeStatus')" :width="90">
        <template #default="{ record }">
          <a-tag :color="record.status === 'valid' ? 'green' : 'orange'">{{ record.status === "valid" ? t("certd.localCa.acmeAccountValid") : t("certd.localCa.acmeAccountDisabled") }}</a-tag>
        </template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.acmeAccountId')" data-index="id" :width="190" ellipsis />
      <a-table-column :title="t('certd.localCa.acmeAccountEab')" :width="170" ellipsis>
        <template #default="{ record }">
          <template v-if="record.eabId">
            <span>{{ record.eabName || record.eabKid }}</span>
            <a-tag v-if="record.eabPrivileged" color="orange" class="ml-1">{{ t("certd.localCa.eabTypePrivileged") }}</a-tag>
            <a-tag v-if="record.eabDisabled" color="red" class="ml-1">{{ t("common.disabled") }}</a-tag>
          </template>
          <a-tag v-else color="red">{{ t("certd.localCa.acmeAccountNoEab") }}</a-tag>
        </template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.acmeOwner')" :width="150" ellipsis>
        <template #default="{ record }">{{ ownerLabel(record) }}</template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.acmeContact')" :width="170" ellipsis>
        <template #default="{ record }">{{ (record.contact || []).join(", ") || "-" }}</template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.acmeOrders')" data-index="orderCount" :width="80" align="center" />
      <a-table-column :title="t('certd.localCa.acmeIssued')" data-index="issuedCount" :width="80" align="center" />
      <a-table-column :title="t('certd.localCa.certApplyTime')" :width="165">
        <template #default="{ record }">{{ formatTime(record.createTime) }}</template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.eabCa')" :width="150" ellipsis>
        <template #default="{ record }">{{ record.caName || `#${record.caId}` }}</template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.certActions')" :width="200">
        <template #default="{ record }">
          <div class="local-ca-row-actions">
            <a-button v-if="record.eabId" type="link" size="small" @click="viewEab(record)">{{ t("certd.localCa.acmeViewEab") }}</a-button>
            <a-button type="link" size="small" @click="viewOrders(record)">{{ t("certd.localCa.acmeViewOrders") }}</a-button>
            <a-button type="link" size="small" :danger="record.status === 'valid'" @click="toggleStatus(record)">
              {{ record.status === "valid" ? t("certd.common.disabled") : t("certd.common.enabled") }}
            </a-button>
          </div>
        </template>
      </a-table-column>
    </a-table>
  </div>
</template>

<script setup lang="tsx">
import { onMounted, ref, watch } from "vue";
import { Modal, notification } from "ant-design-vue";
import dayjs from "dayjs";
import { useI18n } from "/src/locales";
import { request } from "/@/api/service";
import { useModal } from "/@/use/use-modal";
import CertView from "/@/views/certd/pipeline/cert-view.vue";
import { getSecretAccessToken } from "/@/views/certd/access/api";
import { useStepUp } from "../use-step-up";
import { localCaApi } from "../api";

defineOptions({ name: "LocalCaAccountsTable" });

const props = defineProps<{ caId: number }>();

const { t } = useI18n();
const model = useModal();
const { openStepUp } = useStepUp();
const accounts = ref<any[]>([]);
const loading = ref(false);
const users = ref<any[]>([]);
const projects = ref<any[]>([]);

function formatTime(value: any) {
  if (!value) {
    return "-";
  }
  return dayjs(Number(value) || value).format("YYYY-MM-DD HH:mm:ss");
}
function ownerLabel(record: any) {
  if (!(Number(record.userId) > 0)) {
    return t("certd.localCa.systemLevelTag");
  }
  const user = users.value.find(u => Number(u.id) === Number(record.userId));
  const name = user ? user.nickName || user.username : `#${record.userId}`;
  if (record.projectId) {
    const project = projects.value.find(p => Number(p.id) === Number(record.projectId));
    return `${name} / ${project ? project.name : `#${record.projectId}`}`;
  }
  return name;
}

async function load() {
  if (!props.caId) {
    accounts.value = [];
    return;
  }
  loading.value = true;
  try {
    accounts.value = (await localCaApi.ListAcmeAccounts(props.caId)) || [];
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
  } catch (e: any) {
    notification.error({ message: String(e?.message || e) });
    accounts.value = [];
  } finally {
    loading.value = false;
  }
}

async function viewEab(row: any) {
  const eabs = (await localCaApi.ListEab(props.caId)) || [];
  const eab = eabs.find((item: any) => item.id === row.eabId);
  if (!eab) {
    notification.warning({ message: t("certd.localCa.eabNotFound") });
    return;
  }
  const domains = (() => {
    try {
      const arr = typeof eab.allowedDomains === "string" ? JSON.parse(eab.allowedDomains) : eab.allowedDomains;
      return Array.isArray(arr) && arr.length ? arr.join(", ") : t("certd.localCa.eabInheritCa");
    } catch {
      return t("certd.localCa.eabInheritCa");
    }
  })();
  model.success({
    title: `${t("certd.localCa.eabViewTitle")} - ${eab.name}`,
    maskClosable: true,
    okText: t("certd.common.close"),
    width: 640,
    zIndex: 1200,
    content: () => (
      <a-descriptions bordered column={1} size="small">
        <a-descriptions-item label="KID">{eab.kid}</a-descriptions-item>
        <a-descriptions-item label={t("certd.localCa.eabType")}>{eab.privileged ? t("certd.localCa.eabTypePrivileged") : t("certd.localCa.eabTypeNormal")}</a-descriptions-item>
        <a-descriptions-item label={t("certd.localCa.fields.disabled")}>{eab.disabled ? t("common.disabled") : t("common.enabled")}</a-descriptions-item>
        <a-descriptions-item label={t("certd.localCa.eabAllowedDomains")}>{domains}</a-descriptions-item>
        <a-descriptions-item label={t("certd.localCa.eabUses")}>{`${eab.usedCount || 0} / ${eab.maxUses || "∞"}`}</a-descriptions-item>
        <a-descriptions-item label={t("certd.localCa.eabExpires")}>{formatTime(eab.expiresTime)}</a-descriptions-item>
        <a-descriptions-item label={t("certd.localCa.fields.remark")}>{eab.remark || "-"}</a-descriptions-item>
      </a-descriptions>
    ),
  });
}

async function viewOrders(row: any) {
  let orders: any[] = [];
  try {
    orders = (await localCaApi.ListAcmeOrders(props.caId, row.id)) || [];
  } catch (e: any) {
    notification.error({ message: String(e?.message || e) });
    return;
  }
  const orderStatus = (status: string) => {
    const map: Record<string, string> = {
      pending: t("certd.localCa.orderStatusPending"),
      ready: t("certd.localCa.orderStatusReady"),
      processing: t("certd.localCa.orderStatusProcessing"),
      valid: t("certd.localCa.orderStatusValid"),
      invalid: t("certd.localCa.orderStatusInvalid"),
    };
    return map[status] || status;
  };
  const orderColor = (status: string) => {
    if (status === "valid") {
      return "green";
    }
    if (status === "invalid") {
      return "red";
    }
    if (status === "ready") {
      return "blue";
    }
    return "orange";
  };
  model.success({
    title: `${t("certd.localCa.acmeOrdersTitle")} - ${row.id}`,
    maskClosable: true,
    okText: t("certd.common.close"),
    width: 1000,
    zIndex: 1200,
    content: () => (
      <a-table dataSource={orders} pagination={{ pageSize: 10 }} size="small" rowKey="id">
        <a-table-column title={t("certd.localCa.acmeOrderStatus")} width={110}>
          {{ default: ({ record: order }: any) => <a-tag color={orderColor(order.status)}>{orderStatus(order.status)}</a-tag> }}
        </a-table-column>
        <a-table-column title={t("certd.localCa.certDomain")} width={220}>
          {{ default: ({ record: order }: any) => (order.identifiers || []).map((item: any) => item.value).join(", ") }}
        </a-table-column>
        <a-table-column title={t("certd.localCa.certSerial")} dataIndex="serialNumber" width={240} />
        <a-table-column title={t("certd.localCa.eabOrderType")} width={100} align="center">
          {{ default: ({ record: order }: any) => <a-tag color={order.directIssue ? "green" : "default"}>{order.directIssue ? t("certd.localCa.orderDirectIssueYes") : t("certd.localCa.orderDirectIssueNo")}</a-tag> }}
        </a-table-column>
        <a-table-column title={t("certd.common.createTime")} width={180}>
          {{ default: ({ record: order }: any) => <span style={{ whiteSpace: "nowrap" }}>{formatTime(order.createTime)}</span> }}
        </a-table-column>
        <a-table-column title={t("certd.localCa.certActions")} width={120} align="center">
          {{
            default: ({ record: order }: any) =>
              order.certPem ? (
                <a-button type="link" size="small" onClick={() => viewOrderCert(order)}>
                  {t("certd.localCa.viewCertInfo")}
                </a-button>
              ) : (
                <span>-</span>
              ),
          }}
        </a-table-column>
      </a-table>
    ),
  });
}

async function viewOrderCert(order: any) {
  if (!order.certPem) {
    return;
  }
  const res = await localCaApi.GetCertDetail(order.certPem);
  model.success({
    title: t("certd.localCa.viewTitle"),
    maskClosable: true,
    okText: t("certd.common.confirm"),
    width: 800,
    zIndex: 1300,
    content: () => <CertView cert={{ crt: order.certPem, key: "", ic: "", detail: res.detail }} />,
  });
}

function toggleStatus(row: any) {
  const status = row.status === "valid" ? "deactivated" : "valid";
  const title = status === "valid" ? t("certd.localCa.acmeEnableConfirm") : t("certd.localCa.acmeDisableConfirm");
  Modal.confirm({
    title,
    content: t("certd.localCa.acmeStatusConfirmHint"),
    okText: t("certd.common.confirm"),
    cancelText: t("certd.common.cancel"),
    async onOk() {
      const submit = async () => {
        await localCaApi.SetAcmeAccountStatus(props.caId, row.id, status, status === "valid" ? getSecretAccessToken() : undefined);
        notification.success({ message: t("certd.localCa.acmeStatusChanged") });
        await load();
      };
      if (status === "valid") {
        await openStepUp(t("certd.localCa.acmeStepUpTitle"), t("certd.localCa.acmeStepUpDesc"), submit);
      } else {
        await submit();
      }
    },
  });
}

watch(() => props.caId, load);
onMounted(load);
defineExpose({ load });
</script>

<style lang="less">
.local-ca-accounts-table {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
</style>
