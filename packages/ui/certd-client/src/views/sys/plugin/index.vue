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
          :editable="item.editable"
          :copy-handler="copyPlugin"
          @changed="handlePluginChanged"
          @click="openPluginDetail"
        />
      </div>
    </fs-crud>
  </fs-page>
</template>

<script lang="tsx" setup>
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import PluginItemCard from "./components/plugin-item-card.vue";
import OnlinePluginDetail from "./components/online-plugin-detail.vue";
import { useI18n } from "/src/locales";
import { useMounted } from "/@/use/use-mounted";
import { computed, onBeforeUnmount, onMounted } from "vue";
import { usePluginStore } from "/@/store/plugin";
import { useFormDialog } from "/@/use/use-dialog";

const { t } = useI18n();
const pluginStore = usePluginStore();
const { openFormDialog } = useFormDialog();

defineOptions({
  name: "SysPlugin",
});
const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions });
const pluginList = computed(() => {
  return crudBinding.value?.data || [];
});

function getPluginCardSource(row: any) {
  return row.type === "store" && Number(row.developerId) > 0 ? "market" : "local";
}

async function openPluginDetail(row: any) {
  if (row.type !== "store" || !(row.fullName || (row.author && row.name))) {
    return;
  }
  await openFormDialog({
    title: `插件详情 ${row.title || row.name || row.fullName}`,
    columns: {},
    noneForm: true,
    className: "online-plugin-detail-dialog",
    wrapper: {
      width: "min(1540px, calc(100vw - 48px))",
      destroyOnClose: true,
      maskClosable: true,
      footer: null,
    },
    body: () => <OnlinePluginDetail plugin={row} onInstalled={handleDetailInstalled} />,
  });
}

function handleDependencyDetail(event: Event) {
  const row = (event as CustomEvent).detail;
  void openPluginDetail(row);
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

onMounted(() => {
  window.addEventListener("certd:plugin-detail", handleDependencyDetail);
});

onBeforeUnmount(() => {
  window.removeEventListener("certd:plugin-detail", handleDependencyDetail);
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

.online-plugin-detail-dialog {
  .ant-modal-body {
    padding: 0;
    overflow: hidden;
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
