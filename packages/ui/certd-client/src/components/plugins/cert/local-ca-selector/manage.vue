<template>
  <a-modal v-model:open="visible" :title="t('certd.localCa.manageTitle')" width="1100px" :footer="null">
    <div class="mb-3 flex items-center gap-2">
      <a-button type="primary" @click="openGenerate">{{ t("certd.localCa.generate") }}</a-button>
      <a-button @click="openImport">{{ t("certd.localCa.import") }}</a-button>
      <a-button @click="load">{{ t("certd.localCa.refresh") }}</a-button>
      <span class="ml-auto text-gray">{{ t("certd.localCa.manageHint") }}</span>
    </div>
    <a-table :data-source="list" :loading="loading" :pagination="{ pageSize: 8 }" size="small" row-key="id" :scroll="{ x: 1000 }">
      <a-table-column :title="t('certd.localCa.fields.name')" data-index="name" :width="180" />
      <a-table-column :title="t('certd.localCa.fields.caType')" :width="110">
        <template #default="{ record }">
          <a-tag :color="record.caType === 'intermediate' ? 'blue' : 'purple'">
            {{ record.caType === "intermediate" ? t("certd.localCa.caTypeIntermediate") : t("certd.localCa.caTypeRoot") }}
          </a-tag>
        </template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.fields.subjectCn')" data-index="subjectCn" :width="180" />
      <a-table-column :title="t('certd.localCa.fields.parentCa')" data-index="parentName" :width="140" />
      <a-table-column :title="t('certd.localCa.fields.notAfter')" :width="170">
        <template #default="{ record }">{{ formatTime(record.notAfter) }}</template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.fields.disabled')" :width="90" align="center">
        <template #default="{ record }">
          <a-switch :checked="!record.disabled" size="small" @change="(checked: boolean) => toggleDisabled(record, checked)" />
        </template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.certActions')" :width="260">
        <template #default="{ record }">
          <a-tooltip :title="record.caType !== 'intermediate' ? t('certd.localCa.onlyIntermediate') : ''">
            <a-button type="link" size="small" :disabled="record.caType !== 'intermediate'" @click="choose(record)">
              {{ t("certd.localCa.choose") }}
            </a-button>
          </a-tooltip>
          <a-button type="link" size="small" @click="openView(record)">{{ t("certd.localCa.settings") }}</a-button>
          <a-button v-if="record.caType === 'root'" type="link" size="small" @click="openIntermediate(record)">
            {{ t("certd.localCa.intermediate") }}
          </a-button>
          <a-button type="link" size="small" @click="openIssuedCerts(record)">{{ t("certd.localCa.issuedCerts") }}</a-button>
        </template>
      </a-table-column>
    </a-table>
  </a-modal>
  <LocalCaView ref="caViewRef" :on-export="row => caExportHandler?.(row)" />
</template>

<script setup lang="ts">
import { ref } from "vue";
import LocalCaView from "/@/views/certd/cert/local-ca/ca-view.vue";
import { notification } from "ant-design-vue";
import dayjs from "dayjs";
import { useI18n } from "/src/locales";
import { localCaApi } from "/@/views/certd/cert/local-ca/api";
import { useLocalCaDialogs } from "/@/views/certd/cert/local-ca/use";

defineOptions({
  name: "LocalCaManage",
});

const emit = defineEmits<{
  select: [row: any];
}>();

const { t } = useI18n();
const visible = ref(false);
const list = ref<any[]>([]);
const loading = ref(false);
const caViewRef = ref<any>();
const caExportHandler = ref<any>();
const { openGenerate, openIntermediate, openImport, openView, openExport, openIssuedCerts } = useLocalCaDialogs({ doRefresh: load }, caViewRef);
caExportHandler.value = openExport;

async function load() {
  loading.value = true;
  try {
    const res = await localCaApi.GetList({
      page: { page: 1, pageSize: 200 },
      query: {},
      sort: { prop: "id", order: "descending" },
    });
    list.value = res.records || [];
  } finally {
    loading.value = false;
  }
}

function formatTime(value: any) {
  if (!value) {
    return "-";
  }
  return dayjs(Number(value) || value).format("YYYY-MM-DD HH:mm:ss");
}

async function toggleDisabled(row: any, checked: boolean) {
  await localCaApi.Disable(row.id, !checked);
  notification.success({ message: checked ? t("certd.localCa.enabledSuccess") : t("certd.localCa.disabledSuccess") });
  await load();
}

function choose(row: any) {
  emit("select", row);
  visible.value = false;
}

async function open() {
  visible.value = true;
  await load();
}

defineExpose({ open });
</script>
