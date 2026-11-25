<template>
  <div class="local-ca-select">
    <span class="local-ca-select-label">{{ t("certd.localCa.caSelect") }}</span>
    <a-select class="local-ca-select-input" :value="props.modelValue" show-search option-filter-prop="label" :placeholder="t('certd.localCa.caSelect')" :options="options" :loading="loading" @change="onChange" />
    <a-button type="link" size="small" @click="load">{{ t("common.refresh") }}</a-button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "/src/locales";
import { localCaApi } from "../api";

defineOptions({ name: "LocalCaSelect" });

const props = defineProps<{
  modelValue?: number;
  /** 仅列出已启用ACME的中间CA（ACME服务页签用） */
  acmeOnly?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: number | undefined];
  change: [ca: any];
}>();

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const loading = ref(false);
const options = ref<{ label: string; value: number }[]>([]);
const cas = ref<any[]>([]);

function buildLabel(ca: any) {
  const typeLabel = ca.caType === "root" ? t("certd.localCa.caTypeRoot") : t("certd.localCa.caTypeIntermediate");
  const cn = ca.subjectCn ? ` (${ca.subjectCn})` : "";
  return `${ca.name}${cn} 【${typeLabel}】`;
}

let loadSeq = 0;
async function load() {
  const seq = ++loadSeq;
  loading.value = true;
  try {
    const all = (await localCaApi.GetAdminOptions()) || [];
    if (seq !== loadSeq) {
      return;
    }
    let list = all;
    if (props.acmeOnly) {
      list = all.filter((ca: any) => ca.caType === "intermediate" && ca.acmeEnabled && !ca.disabled && !ca.revoked && !ca.rotatedToId);
    }
    cas.value = list;
    options.value = list.map((ca: any) => ({ label: buildLabel(ca), value: Number(ca.id) }));
    const current = props.modelValue;
    if (current != null && list.some((ca: any) => Number(ca.id) === Number(current))) {
      emit(
        "change",
        list.find((ca: any) => Number(ca.id) === Number(current))
      );
      return;
    }
    // 优先恢复URL中的CA选择，否则自动选中第一个，避免页签空白
    const queryId = Number(route.query.caId);
    let initial = list.find((ca: any) => Number(ca.id) === queryId);
    if (!initial && list.length > 0) {
      initial = list[0];
    }
    if (initial) {
      selectCa(Number(initial.id), initial);
    } else {
      emit("update:modelValue", undefined);
      emit("change", undefined);
    }
  } finally {
    if (seq === loadSeq) {
      loading.value = false;
    }
  }
}

function selectCa(id: number, ca: any) {
  emit("update:modelValue", id);
  emit("change", ca);
  router.replace({ path: route.path, query: { ...route.query, caId: String(id) } });
}

function onChange(value: number) {
  const ca = cas.value.find((item: any) => Number(item.id) === Number(value));
  selectCa(Number(value), ca);
}

onMounted(load);
defineExpose({ load });
</script>

<style lang="less">
.local-ca-select {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;

  .local-ca-select-label {
    flex: none;
    font-weight: 500;
  }

  .local-ca-select-input {
    width: 360px;
    max-width: 60%;
  }
}
</style>
