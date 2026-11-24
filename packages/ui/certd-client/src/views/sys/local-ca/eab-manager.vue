<template>
  <div class="eab-manager">
    <div class="eab-manager-toolbar">
      <a-button type="primary" @click="props.onCreate?.()">{{ t("certd.localCa.eabCreateTitle") }}</a-button>
      <a-button @click="load">{{ t("certd.common.refresh") }}</a-button>
    </div>
    <a-table :data-source="list" :loading="loading" :pagination="{ pageSize: 10 }" size="small" row-key="id">
      <a-table-column :title="t('certd.localCa.eabName')" data-index="name" :width="150" ellipsis />
      <a-table-column title="KID" :width="200">
        <template #default="{ record }"><fs-copyable :model-value="record.kid" /></template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.eabGrant')" :width="160">
        <template #default="{ record }">{{ grantLabel(record) }}</template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.eabAllowedDomains')" :width="180">
        <template #default="{ record }">{{ formatDomains(record.allowedDomains) }}</template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.eabUses')" :width="100" align="center">
        <template #default="{ record }">{{ record.usedCount || 0 }} / {{ record.maxUses || "∞" }}</template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.eabExpires')" :width="170">
        <template #default="{ record }">{{ formatTime(record.expiresTime) }}</template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.fields.disabled')" :width="100" align="center">
        <template #default="{ record }">
          <a-switch :checked="!record.disabled" :loading="togglingId === record.id" @change="(v: boolean) => toggle(record, v)" />
        </template>
      </a-table-column>
      <a-table-column :title="t('certd.common.createTime')" :width="170">
        <template #default="{ record }">{{ formatTime(record.createTime) }}</template>
      </a-table-column>
    </a-table>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { notification } from "ant-design-vue";
import dayjs from "dayjs";
import { useI18n } from "/src/locales";
import { localCaApi } from "./api";
import { getSecretAccessToken } from "/@/views/certd/access/api";

defineOptions({ name: "LocalCaEabManager" });

const props = defineProps<{
  caId: number;
  onCreate?: () => void;
  runStepUp?: (action: () => Promise<void>) => Promise<void>;
}>();

const { t } = useI18n();
const list = ref<any[]>([]);
const grants = ref<any[]>([]);
const loading = ref(false);
const togglingId = ref<string | null>(null);

function formatTime(value?: number) {
  return value ? dayjs(Number(value)).format("YYYY-MM-DD HH:mm:ss") : "-";
}
function formatDomains(value: any) {
  if (!value) {
    return t("certd.localCa.eabInheritCa");
  }
  try {
    const arr = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(arr) && arr.length ? arr.join(", ") : t("certd.localCa.eabInheritCa");
  } catch {
    return String(value);
  }
}
function grantLabel(record: any) {
  if (record.grantId) {
    const g = grants.value.find(item => Number(item.id) === Number(record.grantId));
    return g ? `#${g.id}` : `#${record.grantId}`;
  }
  return t("certd.localCa.systemLevelTag");
}

async function load() {
  loading.value = true;
  try {
    const [eabs, gr] = await Promise.all([localCaApi.ListEab(props.caId), localCaApi.ListGrants(props.caId).catch(() => [])]);
    list.value = eabs || [];
    grants.value = gr || [];
  } finally {
    loading.value = false;
  }
}

async function toggle(record: any, enabled: boolean) {
  const action = async () => {
    togglingId.value = record.id;
    try {
      await localCaApi.SetEabStatus(props.caId, record.kid, !enabled, getSecretAccessToken());
      notification.success({ message: t("certd.localCa.eabStatusChanged") });
      await load();
    } finally {
      togglingId.value = null;
    }
  };
  if (!enabled && props.runStepUp) {
    await props.runStepUp(action);
  } else {
    await action();
  }
}

onMounted(load);
defineExpose({ load });
</script>

<style lang="less" scoped>
.eab-manager-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
</style>