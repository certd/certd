<template>
  <div class="local-ca-select">
    <span class="local-ca-select-label">{{ t("certd.localCa.caSelect") }}</span>
    <a-select class="local-ca-select-input" :value="props.modelValue" show-search option-filter-prop="label" :placeholder="t('certd.localCa.caSelect')" :options="options" :loading="loading" @change="onChange" />
    <a-button type="link" size="small" @click="load">{{ t("common.refresh") }}</a-button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
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
const loading = ref(false);
const options = ref<{ label: string; value: number }[]>([]);
const cas = ref<any[]>([]);

function buildLabel(ca: any) {
  const typeLabel = ca.caType === "root" ? t("certd.localCa.caTypeRoot") : t("certd.localCa.caTypeIntermediate");
  const cn = ca.subjectCn ? ` (${ca.subjectCn})` : "";
  let stateTag = "";
  if (ca.deleted) {
    stateTag = `【${t("certd.localCa.stateArchived")}】`;
  } else if (ca.rotatedToId) {
    stateTag = `【${t("certd.localCa.rotatedTag")}】`;
  } else if (ca.disabled) {
    stateTag = `【${t("common.disabled")}】`;
  }
  return `${ca.name}${cn} 【${typeLabel}】${stateTag}`;
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
    // 轮换的中间CA折叠到最新一代：选择器仅显根CA与最新中间CA
    let list = all.filter((ca: any) => !(ca.caType === "intermediate" && ca.rotatedToId));
    if (props.acmeOnly) {
      // 仅展示当前有效（本地/标准档）中间CA；轮换/禁用/归档CA的凭证由最新CA继承管理
      list = list.filter((ca: any) => ca.caType === "intermediate" && ca.acmeEnabled && !ca.disabled && !ca.deleted);
    }
    cas.value = list;
    options.value = list.map((ca: any) => ({ label: buildLabel(ca), value: Number(ca.id) }));
    // 优先使用传入的当前选择；无效时默认选中间CA，避免根CA无ACME/授权页造成误解
    const current = props.modelValue;
    let initial = current != null ? list.find((ca: any) => Number(ca.id) === Number(current)) : undefined;
    if (!initial) {
      initial = list.find((ca: any) => ca.caType === "intermediate") || list[0];
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
