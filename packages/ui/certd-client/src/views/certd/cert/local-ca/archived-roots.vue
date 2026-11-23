<template>
  <div class="archived-roots">
    <a-empty v-if="!loading && list.length === 0" :description="t('certd.localCa.archivedRootsEmpty')" />
    <a-spin :spinning="loading">
      <a-list :data-source="list" size="small">
        <template #renderItem="{ item }">
          <a-list-item>
            <a-list-item-meta>
              <template #title>{{ item.name }} <span class="archived-root-cn">{{ item.subjectCn }}</span></template>
              <template #description>
                {{ t("certd.localCa.archivedRootsCrlExpiry") }}: {{ formatTime(item.crlNextUpdate) }}
              </template>
            </a-list-item-meta>
            <template #actions>
              <a-button size="small" type="primary" :loading="refreshingId === item.id" @click="refresh(item)">
                {{ t("certd.localCa.archivedRootsRefresh") }}
              </a-button>
            </template>
          </a-list-item>
        </template>
      </a-list>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { notification } from "ant-design-vue";
import { useI18n } from "/src/locales";
import { localCaApi } from "./api";
import { getSecretAccessToken } from "/@/views/certd/access/api";

defineOptions({ name: "LocalCaArchivedRoots" });

const props = defineProps<{
  runStepUp?: (action: () => Promise<void>) => Promise<void>;
}>();

const { t } = useI18n();
const list = ref<any[]>([]);
const loading = ref(false);
const refreshingId = ref<number | null>(null);

function formatTime(value?: number) {
  return value ? new Date(value).toLocaleString() : t("certd.localCa.archivedRootsNoCrl");
}

async function load() {
  loading.value = true;
  try {
    list.value = await localCaApi.ListArchivedRoots();
  } finally {
    loading.value = false;
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

<style lang="less" scoped>
.archived-root-cn {
  margin-left: 8px;
  font-size: 12px;
  color: var(--text-color-3, #999);
}
</style>
