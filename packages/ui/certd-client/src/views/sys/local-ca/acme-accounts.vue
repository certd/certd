<template>
  <div>
    <a-alert type="info" show-icon class="mb-3" :message="t('certd.localCa.acmeAccountsHint')" />
    <a-table :data-source="accounts" :loading="loading" :pagination="{ pageSize: 10 }" size="small" row-key="id">
      <a-table-column :title="t('certd.localCa.acmeStatus')" :width="100">
        <template #default="{ record }">
          <a-tag :color="record.status === 'valid' ? 'green' : 'orange'">
            {{ record.status === "valid" ? t("certd.localCa.acmeAccountValid") : t("certd.localCa.acmeAccountDisabled") }}
          </a-tag>
        </template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.acmeAccountId')" data-index="id" :width="200" />
      <a-table-column :title="t('certd.localCa.acmeOwner')" :width="180">
        <template #default="{ record }">
          <span v-if="record.userId > 0"
            >{{ userLabel(record.userId) }}<span v-if="record.projectId"> / {{ projectLabel(record.projectId) }}</span></span
          >
          <a-tag v-else color="purple">{{ t("certd.localCa.systemLevel") }}</a-tag>
        </template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.acmeContact')" :width="180">
        <template #default="{ record }">{{ (record.contact || []).join(", ") || "-" }}</template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.acmeOrders')" :width="100" align="center">
        <template #default="{ record }">{{ record.orderCount }}</template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.acmeIssued')" :width="100" align="center">
        <template #default="{ record }">{{ record.issuedCount }}</template>
      </a-table-column>
      <a-table-column :title="t('certd.common.createTime')" :width="170">
        <template #default="{ record }">{{ formatTime(record.createTime) }}</template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.certActions')" :width="180">
        <template #default="{ record }">
          <a-button type="link" size="small" @click="viewOrders(record)">{{ t("certd.localCa.acmeViewOrders") }}</a-button>
          <a-button type="link" size="small" :danger="record.status === 'valid'" @click="toggleStatus(record)">
            {{ record.status === "valid" ? t("certd.common.disabled") : t("certd.common.enabled") }}
          </a-button>
        </template>
      </a-table-column>
    </a-table>
  </div>

  <a-modal v-model:open="ordersVisible" :title="t('certd.localCa.acmeOrdersTitle')" width="900px" :footer="null">
    <a-table :data-source="orders" :loading="ordersLoading" :pagination="{ pageSize: 10 }" size="small" row-key="id">
      <a-table-column :title="t('certd.localCa.acmeOrderStatus')" :width="110">
        <template #default="{ record }">
          <a-tag :color="orderStatusColor(record.status)">{{ record.status }}</a-tag>
        </template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.certDomain')" :width="220">
        <template #default="{ record }">{{ (record.identifiers || []).map((item: any) => item.value).join(", ") }}</template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.certSerial')" data-index="serialNumber" :width="260" />
      <a-table-column :title="t('certd.localCa.eabDirectIssue')" :width="100" align="center">
        <template #default="{ record }">
          <a-tag :color="record.directIssue ? 'green' : 'default'">{{ record.directIssue ? t("certd.localCa.acmeDirectIssueYes") : t("certd.localCa.acmeDirectIssueNo") }}</a-tag>
        </template>
      </a-table-column>
      <a-table-column :title="t('certd.common.createTime')" :width="170">
        <template #default="{ record }">{{ formatTime(record.createTime) }}</template>
      </a-table-column>
    </a-table>
  </a-modal>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { Modal, notification } from "ant-design-vue";
import dayjs from "dayjs";
import { useI18n } from "/src/locales";
import { request } from "/@/api/service";
import { localCaApi } from "./api";

defineOptions({
  name: "LocalCaAcmeAccounts",
});

const props = defineProps<{
  caId: number;
}>();

const { t } = useI18n();
const accounts = ref<any[]>([]);
const orders = ref<any[]>([]);
const loading = ref(false);
const ordersLoading = ref(false);
const ordersVisible = ref(false);
const userOptions = ref<any[]>([]);
const projectOptions = ref<any[]>([]);

function userLabel(id: number) {
  const user = userOptions.value.find(item => Number(item.id) === Number(id));
  if (!user) return `#${id}`;
  return user.nickName || user.username || (user.phoneCode ? `${user.phoneCode}${user.mobile || ""}` : user.mobile) || `#${id}`;
}
function projectLabel(id: number) {
  return projectOptions.value.find(item => Number(item.id) === Number(id))?.name || `#${id}`;
}

async function loadMeta() {
  try {
    userOptions.value = (await request({ url: "/sys/authority/user/getSimpleUsers", method: "POST" })) || [];
  } catch (e) {
    userOptions.value = [];
  }
  try {
    const res: any = await request({ url: "/sys/enterprise/project/page", method: "post", data: { page: { current: 1, size: 1000 } } });
    projectOptions.value = res?.records || [];
  } catch (e) {
    projectOptions.value = [];
  }
}

async function load() {
  loading.value = true;
  try {
    accounts.value = await localCaApi.ListAcmeAccounts(props.caId);
  } finally {
    loading.value = false;
  }
}

async function viewOrders(record: any) {
  ordersVisible.value = true;
  ordersLoading.value = true;
  try {
    orders.value = await localCaApi.ListAcmeOrders(props.caId, record.id);
  } finally {
    ordersLoading.value = false;
  }
}

function toggleStatus(record: any) {
  const status = record.status === "valid" ? "deactivated" : "valid";
  Modal.confirm({
    title: status === "valid" ? t("certd.localCa.acmeEnableConfirm") : t("certd.localCa.acmeDisableConfirm"),
    content: t("certd.localCa.acmeStatusConfirmHint"),
    okText: t("certd.common.confirm"),
    cancelText: t("certd.common.cancel"),
    async onOk() {
      await localCaApi.SetAcmeAccountStatus(props.caId, record.id, status);
      notification.success({ message: t("certd.localCa.acmeStatusChanged") });
      await load();
    },
  });
}

function formatTime(value: any) {
  if (!value) return "-";
  return dayjs(value).format("YYYY-MM-DD HH:mm:ss");
}

function orderStatusColor(status: string) {
  if (status === "valid") return "green";
  if (status === "invalid") return "red";
  if (status === "ready") return "blue";
  return "orange";
}

onMounted(async () => {
  await loadMeta();
  await load();
});
</script>
