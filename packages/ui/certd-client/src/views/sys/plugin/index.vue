<template>
  <fs-page class="page-sys-plugin">
    <template #header>
      <div class="title">
        {{ t("certd.pluginManagement") }}
        <span class="sub">{{ t("certd.pluginBetaWarning") }}</span>
      </div>
    </template>
    <fs-crud ref="crudRef" class="plugin-card-crud" v-bind="crudBinding">
      <a-empty v-if="pluginList.length === 0" class="plugin-card-empty" />
      <div v-else class="plugin-card-grid">
        <PluginItemCard
          v-for="item of pluginList"
          :key="item.fullName"
          :source="getPluginCardSource(item)"
          :plugin="item"
          show-config
          :editable="canEditPlugin(item)"
          :copy-handler="copyPlugin"
          @changed="handlePluginChanged"
          @click="openPluginDetail"
        />
      </div>
    </fs-crud>
    <OnlinePluginDetailModal v-model:open="detailVisible" :plugin="detailPlugin" @installed="handleDetailInstalled" />
  </fs-page>
</template>

<script lang="ts" setup>
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import PluginItemCard from "./components/plugin-item-card.vue";
import OnlinePluginDetailModal from "./components/online-plugin-detail-modal.vue";
import { useI18n } from "/src/locales";
import { useMounted } from "/@/use/use-mounted";
import { computed, ref } from "vue";
import { useSettingStore } from "/src/store/settings";
import { usePluginStore } from "/@/store/plugin";

const { t } = useI18n();
const settingStore = useSettingStore();
const pluginStore = usePluginStore();

defineOptions({
  name: "SysPlugin",
});
const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions });
const detailVisible = ref(false);
const detailPlugin = ref<any>();

const pluginList = computed(() => {
  return crudBinding.value?.data || [];
});

function getPluginCardSource(row: any) {
  return row.type === "store" && Number(row.developerId) > 0 ? "market" : "local";
}

function canEditPlugin(row: any) {
  if (row.type === "custom") {
    return true;
  }
  if (row.type !== "store") {
    return false;
  }
  const bindUserId = Number(settingStore.installInfo?.bindUserId || 0);
  const developerId = Number(row.developerId || 0);
  return !developerId || (!!bindUserId && developerId === bindUserId);
}

function openPluginDetail(row: any) {
  if (row.type !== "store" || !(row.fullName || (row.author && row.name))) {
    return;
  }
  detailPlugin.value = row;
  detailVisible.value = true;
}

async function handleDetailInstalled() {
  crudExpose.doRefresh();
}

async function copyPlugin(row: any) {
  const copyRow = { ...row };
  delete copyRow.fullName;
  delete copyRow.id;
  delete copyRow.developerId;
  delete copyRow.appId;
  delete copyRow.latest;
  delete copyRow.status;
  delete copyRow.downloadCount;
  delete copyRow.score;
  await crudExpose.openCopy(
    {
      row: copyRow,
    },
    {
      async onSuccess() {
        crudExpose.doRefresh();
      },
    }
  );
}

async function handlePluginChanged(payload: { action: string }) {
  if (payload.action === "install" || payload.action === "uninstall" || payload.action === "remove" || payload.action === "copy") {
    await pluginStore.reload();
  }
  crudExpose.doRefresh();
}

// 页面打开后获取列表数据
useMounted(async () => {
  await crudExpose.doRefresh();
});
</script>
<style lang="less">
.page-sys-plugin {
  .fs-page-content {
    display: flex;
    min-height: 0;
    flex: 1;
    flex-direction: column;
    overflow: hidden;
  }

  .plugin-card-crud {
    height: 100%;
    flex: 1;
    min-height: 0;
  }

  .plugin-card-empty {
    padding: 72px 0;
  }

  .plugin-card-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    padding: 4px 10px 12px;
  }
}
@media (max-width: 1400px) {
  .page-sys-plugin {
    .plugin-card-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
}

@media (max-width: 1000px) {
  .page-sys-plugin {
    .plugin-card-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
}

@media (max-width: 720px) {
  .page-sys-plugin {
    .plugin-card-grid {
      grid-template-columns: 1fr;
    }
  }
}
</style>
