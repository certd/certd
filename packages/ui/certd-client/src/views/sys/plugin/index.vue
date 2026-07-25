<template>
  <fs-page class="page-sys-plugin">
    <template #header>
      <div class="title">
        {{ t("certd.pluginManagement") }}
        <span class="sub">{{ t("certd.pluginBetaWarning") }}</span>
      </div>
    </template>
    <a-tabs v-model:active-key="activeTab" class="plugin-page-tabs">
      <a-tab-pane key="local">
        <template #tab>
          <span class="plugin-page-tab-label">
            <fs-icon icon="ion:cube-outline" />
            <span>{{ t("certd.localPlugin") }}</span>
          </span>
        </template>
        <fs-crud ref="crudRef" class="plugin-card-crud" v-bind="crudBinding">
          <a-empty v-if="pluginList.length === 0" class="plugin-card-empty" />
          <div v-else class="plugin-card-grid">
            <PluginItemCard
              v-for="(item, index) of pluginList"
              :key="item.id || item.name"
              source="local"
              :plugin="item"
              :show-config="settingStore.isComm"
              @edit="openEditPage"
              @copy="openCopy({ index, row: item })"
              @export-plugin="exportPlugin"
              @config="openConfig"
              @remove="removePlugin({ index, row: item })"
              @toggle-disabled="toggleDisabled"
            />
          </div>
        </fs-crud>
      </a-tab-pane>
      <a-tab-pane key="market">
        <template #tab>
          <span class="plugin-page-tab-label">
            <fs-icon icon="ion:storefront-outline" />
            <span>{{ t("certd.pluginMarket") }}</span>
          </span>
        </template>
        <PluginMarketPanel @changed="handleMarketPluginChanged" />
      </a-tab-pane>
    </a-tabs>
  </fs-page>
</template>

<script lang="ts" setup>
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { message, Modal } from "ant-design-vue";
import * as api from "./api";
import PluginMarketPanel from "./components/plugin-market-panel.vue";
import PluginItemCard from "./components/plugin-item-card.vue";
import { useI18n } from "/src/locales";
import { useMounted } from "/@/use/use-mounted";
import { computed, ref } from "vue";
import { usePluginStore } from "/@/store/plugin";
import { usePluginConfig } from "./use-config";
import { useSettingStore } from "/src/store/settings";
import { useRouter } from "vue-router";

const { t } = useI18n();
const pluginStore = usePluginStore();
const settingStore = useSettingStore();
const { openConfigDialog } = usePluginConfig();
const router = useRouter();

defineOptions({
  name: "SysPlugin",
});
const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions });
const activeTab = ref("local");

const pluginList = computed(() => {
  return crudBinding.value?.data || [];
});

function openEditPage(row: any) {
  router.push(`/sys/plugin/edit?id=${row.id}`);
}

async function openCopy(opts: any) {
  await crudExpose.openCopy({
    row: {
      ...opts.row,
    },
    index: opts.index,
  });
}

async function removePlugin(opts: any) {
  await crudExpose.doRemove(opts);
}

async function openConfig(row: any) {
  await openConfigDialog({
    row,
    crudExpose,
  });
}

async function exportPlugin(row: any) {
  const content = await api.ExportPlugin(row.id);
  if (!content) {
    return;
  }
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${row.name}.yaml`;
  link.click();
  URL.revokeObjectURL(url);
}

async function toggleDisabled(row: any) {
  Modal.confirm({
    title: t("certd.confirm"),
    content: `${t("certd.confirmToggle")} ${!row.disabled ? t("certd.disable") : t("certd.enable")}?`,
    async onOk() {
      await api.SetDisabled({
        id: row.id,
        name: row.name,
        type: row.type,
        disabled: !row.disabled,
      });
      await pluginStore.reload();
      crudExpose.doRefresh();
      message.success(t("certd.operationSuccess"));
    },
  });
}

function handleMarketPluginChanged() {
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

  .plugin-page-tabs {
    display: flex;
    height: 100%;
    min-height: 0;
    flex: 1;
    flex-direction: column;

    > .ant-tabs-nav {
      flex: none;
      margin: 4px 0 12px;
      padding: 0 12px;
    }

    > .ant-tabs-content-holder {
      display: flex;
      min-height: 0;
      flex: 1;

      > .ant-tabs-content {
        display: flex;
        min-height: 0;
        flex: 1;

        > .ant-tabs-tabpane {
          min-height: 0;
          flex: 1;
          flex-direction: column;
        }

        > .ant-tabs-tabpane-active {
          display: flex;
        }
      }
    }
  }

  .plugin-page-tab-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    line-height: 1;

    .fs-icon {
      flex: none;
      font-size: 16px;
      line-height: 1;
    }
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
