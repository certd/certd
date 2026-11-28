<template>
  <div class="ca-access">
    <template v-if="caType === 'intermediate'">
      <a-alert type="info" show-icon class="mb-3" :message="t('certd.localCa.grantHint')" />
      <fs-crud ref="crudRef" class="grant-crud" v-bind="crudBinding" />
    </template>
    <a-alert v-else type="info" show-icon class="mb-3" :message="t('certd.localCa.rootGrantHint')" />
  </div>
</template>

<script setup lang="tsx">
import { computed } from "vue";
import { useFs } from "@fast-crud/fast-crud";
import { useI18n } from "/src/locales";
import createGrantCrudOptions from "./crud-grant";
import { useLocalCaGrantDialogs } from "./use-grant";

defineOptions({
  name: "LocalCaAccess",
});

const props = defineProps<{
  caId: number;
  caType?: string;
  runStepUp: (title: string, desc: string, action: () => Promise<void>) => Promise<boolean>;
}>();

const { t } = useI18n();
const caIdRef = computed(() => props.caId);
const { ensureOptions, userLabel, projectLabel, openAddGrant, openRemoveGrant } = useLocalCaGrantDialogs();

const context = {
  caIdRef,
  ensureOptions,
  userLabel,
  projectLabel,
  openAddGrant: (onDone?: () => void) =>
    openAddGrant({
      caId: props.caId,
      caType: props.caType,
      runStepUp: props.runStepUp,
      onDone,
    }),
  openRemoveGrant: (row: any, onDone?: () => void) =>
    openRemoveGrant({
      caId: props.caId,
      record: row,
      label: Number(row.userId) > 0 ? userLabel(row.userId) : projectLabel(row.projectId),
      runStepUp: props.runStepUp,
      onDone,
    }),
};

const { crudBinding, crudRef } = useFs({ createCrudOptions: createGrantCrudOptions, context });
</script>

<style lang="less">
.ca-access {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;

  .grant-crud {
    flex: 1;
    min-height: 0;
  }
}
</style>
