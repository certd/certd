<template>
  <a-modal v-model:open="open" :title="t('certd.localCa.manageDialogTitle')" width="min(1400px, calc(100vw - 48px))" :footer="null" destroy-on-close class="ca-manage-dialog">
    <div class="ca-manage-dialog__body">
      <div class="ca-manage-dialog__head">
        <CaSelect v-model="caId" @change="onCaChange" />
        <div v-if="currentCa" class="ca-manage-dialog__ca">
          <a-tag :color="currentCa.caType === 'root' ? 'purple' : 'blue'">
            {{ currentCa.caType === "root" ? t("certd.localCa.caTypeRoot") : t("certd.localCa.caTypeIntermediate") }}
          </a-tag>
          <span class="name">{{ currentCa.name }}</span>
          <span v-if="currentCa.subjectCn" class="cn">{{ currentCa.subjectCn }}</span>
          <a-tag v-if="currentCa.deleted" color="default">{{ t("certd.localCa.stateArchived") }}</a-tag>
          <a-tag v-else-if="currentCa.rotatedToId" color="orange">{{ t("certd.localCa.rotatedTag") }}</a-tag>
          <a-tag v-else-if="currentCa.disabled" color="red">{{ t("common.disabled") }}</a-tag>
        </div>
      </div>
      <a-tabs v-model:active-key="activeTab" class="ca-manage-dialog__tabs">
        <a-tab-pane key="permissions" :tab="t('certd.localCa.permissions')">
          <LocalCaAccess v-if="caId" :key="'perm-' + caId" :ca-id="caId" :ca-type="currentCa?.caType" :run-step-up="openStepUp" />
        </a-tab-pane>
        <a-tab-pane key="acme" :tab="t('certd.localCa.tabAcmeService')">
          <template v-if="caId && currentCa">
            <AcmeServiceInner v-if="currentCa.caType === 'intermediate' && currentCa.acmeEnabled" :key="'acme-' + caId" :ca-id="caId" />
            <a-empty v-else :description="currentCa.caType === 'root' ? t('certd.localCa.acmeRootCaHint') : t('certd.localCa.acmeNotEnabledHint')" />
          </template>
        </a-tab-pane>
        <a-tab-pane key="certs" :tab="t('certd.localCa.tabIssuedCerts')">
          <IssuedCerts v-if="caId" :key="'certs-' + caId" :ca-id="caId" />
        </a-tab-pane>
      </a-tabs>
    </div>
  </a-modal>
</template>

<script lang="ts" setup>
import { ref, watch } from "vue";
import { useI18n } from "/src/locales";
import CaSelect from "./components/ca-select.vue";
import LocalCaAccess from "./ca-access.vue";
import AcmeServiceInner from "./tabs/acme-service-inner.vue";
import IssuedCerts from "./tabs/issued-certs.vue";
import { useStepUp } from "./use-step-up";

defineOptions({ name: "LocalCaManageDialog" });

const props = defineProps<{
  caId?: number;
  tab?: string;
}>();

const open = defineModel<boolean>("open", { default: false });
const { t } = useI18n();
const { openStepUp } = useStepUp();
const caId = ref<number | undefined>(props.caId);
const currentCa = ref<any>();
const activeTab = ref(props.tab || "permissions");

watch(
  () => props.caId,
  v => {
    if (v != null) {
      caId.value = v;
    }
  }
);

watch(
  () => props.tab,
  v => {
    if (v) {
      activeTab.value = v;
    }
  }
);

function onCaChange(ca: any) {
  currentCa.value = ca;
}
</script>

<style lang="less">
.ca-manage-dialog {
  .ant-modal-body {
    padding-top: 12px;
  }

  &__body {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: min(76vh, 720px);
  }

  &__head {
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__ca {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text-color-2, #666);

    .name {
      font-weight: 600;
      color: var(--text-color, #333);
    }

    .cn {
      color: var(--text-color-3, #999);
    }
  }

  &__tabs {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    margin-top: 8px;

    .ant-tabs-content-holder,
    .ant-tabs-content,
    .ant-tabs-tabpane {
      display: flex;
      flex: 1;
      min-height: 0;
    }

    .ant-tabs-tabpane {
      flex-direction: column;
      overflow: auto;
    }
  }
}
</style>
