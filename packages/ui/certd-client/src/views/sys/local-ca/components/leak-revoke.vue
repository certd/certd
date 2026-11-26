<template>
  <div class="local-ca-leak-revoke">
    <a-alert type="warning" show-icon class="mb-3" :message="t('certd.localCa.leakRevokeHint')" />
    <a-table :data-source="accounts" :loading="loading" :pagination="false" row-key="id" size="small" :row-selection="{ selectedRowKeys: selectedKeys, onChange: onSelectChange }">
      <a-table-column :title="t('certd.localCa.acmeAccountId')" data-index="id" :width="200" ellipsis />
      <a-table-column :title="t('certd.localCa.acmeEmail')" :width="180" ellipsis>
        <template #default="{ record }">{{ emailText(record) }}</template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.acmeStatus')" :width="90">
        <template #default="{ record }">
          <a-tag :color="record.status === 'valid' ? 'green' : 'orange'">{{ record.status === "valid" ? t("certd.localCa.acmeAccountValid") : t("certd.localCa.acmeAccountDisabled") }}</a-tag>
        </template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.acmeOrders')" data-index="orderCount" :width="80" align="center" />
      <a-table-column :title="t('certd.localCa.acmeIssued')" data-index="issuedCount" :width="80" align="center" />
      <a-table-column :title="t('certd.localCa.leakRevokeRegisterTime')" :width="170">
        <template #default="{ record }">{{ formatTime(record.createTime) }}</template>
      </a-table-column>
    </a-table>
    <div class="leak-revoke-actions">
      <span class="leak-revoke-count">{{ t("certd.localCa.leakRevokeSelected", { count: selectedKeys.length }) }}</span>
      <a-button type="primary" danger :disabled="!selectedKeys.length" :loading="submitting" @click="submit">{{ t("certd.localCa.leakRevokeSubmit") }}</a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { Modal, notification } from "ant-design-vue";
import dayjs from "dayjs";
import { useI18n } from "/src/locales";
import { getSecretAccessToken } from "/@/views/certd/access/api";
import { localCaApi } from "../api";

defineOptions({ name: "LocalCaLeakRevoke" });

const props = defineProps<{
  caId: number;
  eabId: string;
  runStepUp: (action: () => Promise<void>) => Promise<boolean>;
  onDone?: () => void;
}>();

const { t } = useI18n();
const accounts = ref<any[]>([]);
const loading = ref(false);
const submitting = ref(false);
const selectedKeys = ref<string[]>([]);

function formatTime(value: any) {
  if (!value) {
    return "-";
  }
  return dayjs(Number(value) || value).format("YYYY-MM-DD HH:mm:ss");
}
function emailText(record: any) {
  const list = Array.isArray(record.contact) ? record.contact : [];
  const emails = list.map((item: string) => String(item).replace(/^mailto:/i, "")).filter(Boolean);
  return emails.length ? emails.join(", ") : "-";
}
function onSelectChange(keys: string[]) {
  selectedKeys.value = keys;
}

async function load() {
  loading.value = true;
  try {
    accounts.value = (await localCaApi.ListEabAccounts(props.caId, props.eabId)) || [];
  } catch (e: any) {
    notification.error({ message: String(e?.message || e) });
  } finally {
    loading.value = false;
  }
}

function submit() {
  Modal.confirm({
    title: t("certd.localCa.leakRevokeSubmit"),
    content: t("certd.localCa.leakRevokeConfirm", { count: selectedKeys.value.length }),
    okText: t("certd.common.confirm"),
    cancelText: t("certd.common.cancel"),
    okButtonProps: { danger: true },
    async onOk() {
      await props.runStepUp(async () => {
        submitting.value = true;
        try {
          const res: any = await localCaApi.LeakRevokeEab(props.caId, props.eabId, selectedKeys.value, getSecretAccessToken());
          notification.success({ message: t("certd.localCa.leakRevokeSuccess", { accounts: res?.disabledAccounts ?? 0, certs: res?.revokedCerts ?? 0 }) });
          selectedKeys.value = [];
          await load();
          props.onDone?.();
        } finally {
          submitting.value = false;
        }
      });
    },
  });
}

onMounted(load);
</script>

<style lang="less">
.local-ca-leak-revoke {
  .leak-revoke-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 12px;
  }
  .leak-revoke-count {
    font-size: 12px;
    color: #999;
  }
}
</style>
