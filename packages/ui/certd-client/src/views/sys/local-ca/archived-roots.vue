<template>
  <div class="archived-roots">
    <a-table :data-source="list" :loading="loading" :pagination="{ pageSize: 10 }" size="small" row-key="id">
      <a-table-column :title="t('certd.localCa.fields.name')" data-index="name" :width="200" ellipsis />
      <a-table-column :title="t('certd.localCa.fields.caType')" :width="100">
        <template #default="{ record }">
          <a-tag :color="record.caType === 'root' ? 'purple' : 'blue'">{{ record.caType === "root" ? t("certd.localCa.caTypeRoot") : t("certd.localCa.caTypeIntermediate") }}</a-tag>
        </template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.fields.subjectCn')" data-index="subjectCn" :width="180" ellipsis />
      <a-table-column :title="t('certd.localCa.fields.keyType')" data-index="keyType" :width="100" />
      <a-table-column :title="t('certd.localCa.archivedValidity')" :width="200">
        <template #default="{ record }">{{ formatDate(record.notBefore) }} ~ {{ formatDate(record.notAfter) }}</template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.archivedRootsCrlExpiry')" :width="180">
        <template #default="{ record }">{{ formatTime(record.crlNextUpdate) }}</template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.accessActions')" :width="160" align="center">
        <template #default="{ record }">
          <a-button type="link" size="small" @click="view(record)">{{ t("certd.localCa.view") }}</a-button>
          <a-button v-if="record.caType === 'root'" type="link" size="small" :loading="refreshingId === record.id" @click="refresh(record)">
            {{ t("certd.localCa.archivedRootsRefresh") }}
          </a-button>
        </template>
      </a-table-column>
    </a-table>
    <LocalCaView ref="caViewRef" :on-export="exportArchived" :on-acme-enable="enableArchivedAcme" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { notification } from "ant-design-vue";
import dayjs from "dayjs";
import { useI18n } from "/src/locales";
import { localCaApi } from "./api";
import { getSecretAccessToken } from "/@/views/certd/access/api";
import LocalCaView from "./ca-view.vue";

defineOptions({ name: "LocalCaArchivedRoots" });

const props = defineProps<{
  runStepUp?: (action: () => Promise<void>) => Promise<void>;
}>();

const { t } = useI18n();
const list = ref<any[]>([]);
const loading = ref(false);
const refreshingId = ref<number | null>(null);
const caViewRef = ref<any>();

async function exportArchived(row: any) {
  if (!props.runStepUp) {
    return;
  }
  await props.runStepUp(async () => {
    const res = await localCaApi.Export(row.id, getSecretAccessToken());
    notification.success({ message: t("certd.localCa.exportSaved", { path: res.path }) });
  });
}

async function enableArchivedAcme() {
  notification.warning({ message: t("certd.localCa.archivedAcmeEnableDenied") });
}

function formatTime(value?: number) {
  return value ? dayjs(Number(value)).format("YYYY-MM-DD HH:mm:ss") : t("certd.localCa.archivedRootsNoCrl");
}
function formatDate(value?: number) {
  return value ? dayjs(Number(value)).format("YYYY-MM-DD") : "-";
}

async function load() {
  loading.value = true;
  try {
    list.value = await localCaApi.ListArchivedRoots();
  } finally {
    loading.value = false;
  }
}

async function view(record: any) {
  try {
    const data = await localCaApi.GetArchivedInfo(record.id);
    caViewRef.value?.open(data);
  } catch (e: any) {
    notification.error({ message: e?.message || t("certd.localCa.viewFailed") });
  }
}

async function refresh(item: any) {
  const action = async () => {
    refreshingId.value = item.id;
    try {
      await localCaApi.RefreshArchivedRootCrl(item.id, getSecretAccessToken());
      notification.success({ message: t("certd.localCa.archivedRootsSuccess") });
      await load();
    } finally {
      refreshingId.value = null;
    }
  };
  if (props.runStepUp) {
    await props.runStepUp(action);
  } else {
    await action();
  }
}

onMounted(load);
</script>
