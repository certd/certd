<template>
  <div class="domain-select">
    <div class="flex flex-row">
      <a-select
        ref="selectRef"
        :key="selectKey"
        class="domain-select-input"
        :popup-class-name="popupClassName"
        :dropdown-style="dropdownStyle"
        show-search
        :filter-option="filterOption"
        :options="optionsRef"
        :value="value"
        :tag-render="tagRender"
        v-bind="attrs"
        @click="onClick"
        @blur="onSelectBlur"
        @focusout="onSelectBlur"
        @keydown.capture="onKeydownCapture"
        @search="onSearchText"
        @update:value="onValueChange"
      >
        <template #dropdownRender="{ menuNode }">
          <template v-if="search">
            <div class="flex w-full items-center justify-between flex-wrap" style="padding: 4px 8px">
              <div class="flex-1 flex flex-row items-center">
                <a-input ref="inputRef" v-model:value="searchKeyRef" class="flex-1" allow-clear :placeholder="t('certd.common.pluginCommon.domainSearchPlaceholder')" @keydown.enter="doSearch" />
                <fs-button type="primary" class="m-1" :loading="loading" icon="mingcute:search-2-line" @click="doSearch">{{ t("certd.common.pluginCommon.search") }}</fs-button>
              </div>
              <div class="manager flex flex-row items-center">
                <fs-button type="primary" class="m-1" icon="mingcute:vip-1-line" @click="openDomainImportDialog">{{ t("certd.common.pluginCommon.importDomain") }}</fs-button>
                <fs-button class="m-1" type="primary" icon="carbon:gui-management" @click="openDomainManager">{{ t("certd.common.pluginCommon.manageDomain") }}</fs-button>
              </div>
            </div>
            <div v-if="hasError" class="helper p-2" :class="{ error: hasError }">
              {{ message }}
            </div>
            <a-divider style="margin: 4px 0" />
          </template>
          <v-nodes :vnodes="menuNode" />

          <div v-if="pager === true" class="pager text-center p-5" @click="paginationClick">
            <a-pagination v-model:current="pagerRef.pageNo" simple :total="pagerRef.total" :page-size="pagerRef.pageSize" @change="onPageChange" />
          </div>
        </template>
        <template #option="scope">
          <div class="flex flex-row items-center">
            <span class="min-w-60">{{ scope.label }}</span>
            <div>
              <fs-values-format :model-value="scope.challengeType" :dict="challengeTypeDict"></fs-values-format>
              <fs-values-format :model-value="scope.dnsProviderType" :dict="dnsProviderTypeDict"></fs-values-format>
            </div>
          </div>
        </template>
      </a-select>
      <div class="ml-5 flex flex-row items-center">
        <fs-button title="复制全部域名" icon="ion:copy-outline" class="domain-select-copy-icon mr-5" @click="copySelectedDomains" />
        <fs-button :loading="loading" :title="t('certd.common.pluginCommon.refreshMyDomains')" icon="ion:refresh-outline" @click="refreshOptions"></fs-button>
      </div>
    </div>
    <div class="helper" :class="{ error: hasError }">
      {{ message }}
    </div>
    <div v-if="invalidDomains.length" class="helper error">
      {{ t("certd.common.pluginCommon.domainNotAllowed", { domains: invalidDomains.join(", ") }) }}
    </div>
    <a-modal v-model:open="editOpen" title="编辑域名" :width="420" @ok="saveEdit">
      <a-input v-model:value="editValue" placeholder="请输入域名" @press-enter="saveEdit" />
    </a-modal>
  </div>
</template>
<script setup lang="tsx">
import { computed, defineComponent, onMounted, ref, Ref, useAttrs, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useClipboard } from "@vueuse/core";
import { notification } from "ant-design-vue";
import { Dicts } from "../lib/dicts";
import { request } from "/@/api/service";
import { openRouteInNewWindow } from "/@/vben/utils";
import { useDomainImportManage } from "/@/views/certd/cert/domain/use";

defineOptions({
  name: "DomainSelector",
});

const { t } = useI18n();
const { copy } = useClipboard({ legacy: true });

const VNodes = defineComponent({
  props: {
    vnodes: {
      type: Object,
      required: true,
    },
  },
  render() {
    return this.vnodes;
  },
});

const props = defineProps<{
  search?: boolean;
  pager?: boolean;
  value?: any[];
  open?: boolean;
  caId?: number;
}>();

const emit = defineEmits<{
  "update:value": any;
}>();

const attrs = useAttrs();

const hasOptions: Ref = ref(null);

const popupClassName = computed(() => {
  if (!hasOptions.value) {
    return "hidden-important";
  }
  return "";
});

const searchKeyRef = ref("");
const optionsRef = ref([]);
const selectRef = ref();
const selectKey = ref(0);
const searchText = ref("");
const editOpen = ref(false);
const editValue = ref("");
const editOriginal = ref("");
let lastValueChangeAt = 0;
let blurTimer: ReturnType<typeof setTimeout> | null = null;
const message = ref("");
const hasError = ref(false);
const loading = ref(false);
const allowedDomains = ref<string[]>([]);
const validationTick = ref(0);
const pagerRef: Ref = ref({
  pageNo: 1,
  total: 0,
  pageSize: 20,
});
const getOptions = async () => {
  if (loading.value) {
    return;
  }

  message.value = "";
  hasError.value = false;
  loading.value = true;
  const pageNo = pagerRef.value.pageNo;
  const pageSize = pagerRef.value.pageSize;
  try {
    const res = await request({
      url: "/cert/domain/page",
      method: "POST",
      data: {
        query: {
          domain: props.search ? searchKeyRef.value : undefined,
        },
        page: {
          offset: (pageNo - 1) * pageSize,
          limit: pageSize,
        },
      },
    });
    const list = res?.records || res || [];

    const options = [];
    for (let item of list) {
      options.push({
        value: item.domain,
        label: item.domain,
        dnsProviderType: item.dnsProviderType,
        challengeType: item.challengeType,
      });
      options.push({
        value: `*.${item.domain}`,
        label: `*.${item.domain}`,
        dnsProviderType: item.dnsProviderType,
        challengeType: item.challengeType,
      });
    }

    optionsRef.value = options;
    if (hasOptions.value == null) {
      //初始设置一次
      if (options.length > 0) {
        hasOptions.value = true;
      } else {
        hasOptions.value = false;
      }
    }
    pagerRef.value.total = list.length;
    if (props.pager) {
      if (res.total != null) {
        pagerRef.value.total = res.total;
      }
    }

    return res;
  } finally {
    loading.value = false;
  }
};

const filterOption = (input: string, option: any) => {
  return option.label.toLowerCase().includes(input.toLowerCase()) || String(option.value).toLowerCase().includes(input.toLowerCase());
};

function normalizeDomains(list: any[]) {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of list || []) {
    for (const part of String(item).split(/[,，、|\s]+/)) {
      const domain = part.trim();
      if (!domain || seen.has(domain)) {
        continue;
      }
      seen.add(domain);
      result.push(domain);
    }
  }
  return result;
}

function isAllowedDomain(domain: string) {
  if (!allowedDomains.value || allowedDomains.value.length === 0) {
    return true;
  }
  const value = String(domain || "")
    .trim()
    .toLowerCase();
  const host = value.startsWith("*.") ? value.slice(2) : value;
  const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host.includes(":");
  return allowedDomains.value.some(item => {
    const prefix = String(item || "")
      .trim()
      .toLowerCase()
      .replace(/^\*\./, "");
    if (!prefix) {
      return true;
    }
    return isIp ? host === prefix : host === prefix || host.endsWith(`.${prefix}`);
  });
}

const invalidDomains = computed(() => {
  validationTick.value;
  return normalizeDomains(props.value || []).filter(domain => !isAllowedDomain(domain));
});

async function loadAllowedDomains(caId?: number) {
  validationTick.value++;
  if (!caId) {
    allowedDomains.value = [];
    return;
  }
  try {
    const info: any = await request({
      url: "/cert/local-ca/info",
      method: "post",
      params: { id: caId },
    });
    let list: string[] = [];
    try {
      const parsed = info?.allowedDomains ? JSON.parse(info.allowedDomains) : [];
      list = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      list = [];
    }
    allowedDomains.value = list;
  } catch (e) {
    allowedDomains.value = [];
  } finally {
    validationTick.value++;
    selectKey.value++;
  }
}

watch(
  () => props.caId,
  async caId => {
    await loadAllowedDomains(caId);
  },
  { immediate: true }
);

function isChanged(list: string[], normalized: string[]) {
  return normalized.length !== list.length || normalized.some((item, index) => item !== list[index]);
}

function cleanValue() {
  const list = props.value || [];
  const normalized = normalizeDomains(list);
  if (isChanged(list, normalized)) {
    emit("update:value", normalized);
    // 强制重建，清除 a-select 内部残留的非法 tag
    selectKey.value++;
  }
}

watch(
  () => props.value,
  () => cleanValue(),
  { deep: true }
);

function onValueChange(list: string[]) {
  lastValueChangeAt = Date.now();
  const normalized = normalizeDomains(list);
  emit("update:value", normalized);
  if (isChanged(list, normalized)) {
    selectKey.value++;
  }
}

// 输入法组合期间的回车/空格/逗号交给输入法处理，避免生成重复或空标签
function onKeydownCapture(e: KeyboardEvent) {
  if (!(e.isComposing || e.keyCode === 229)) {
    return;
  }
  if (e.key === "Enter" || e.key === " " || e.key === "," || e.key === "，") {
    e.stopPropagation();
  }
}

function onSearchText(value: string) {
  searchText.value = value;
}

// 失去焦点时清理已有非法项，并清空输入框；稍作延迟避免影响下拉选择
function onSelectBlur() {
  if (blurTimer) {
    clearTimeout(blurTimer);
  }
  blurTimer = setTimeout(() => {
    blurTimer = null;
    const text = searchText.value;
    searchText.value = "";
    const input = selectRef.value?.$el?.querySelector("input");
    if (input?.value) {
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    cleanValue();
    validationTick.value++;

    const value = normalizeDomains([text]).join(",");
    // 刚通过下拉选择或分隔符新增过标签时，不把过滤词当成域名
    if (!value || Date.now() - lastValueChangeAt < 500) {
      return;
    }
    emit("update:value", normalizeDomains([...(props.value || []), value]));
  }, 50);
}

function editTag(domain: string) {
  searchText.value = "";
  editOriginal.value = domain;
  editValue.value = domain;
  editOpen.value = true;
}

function saveEdit() {
  const value = editValue.value.trim();
  const list = normalizeDomains(props.value);
  const index = list.indexOf(editOriginal.value);
  if (index >= 0) {
    if (value) {
      list[index] = value;
    } else {
      list.splice(index, 1);
    }
  } else if (value) {
    list.push(value);
  }
  emit("update:value", normalizeDomains(list));
  editOpen.value = false;
  editValue.value = "";
  editOriginal.value = "";
}

async function onClick() {
  if (optionsRef.value?.length === 0) {
    await refreshOptions();
  }
}

async function refreshOptions() {
  await getOptions();
}

async function doSearch() {
  pagerRef.value.pageNo = 1;
  await refreshOptions();
}

async function onPageChange(current: any) {
  await refreshOptions();
}

async function paginationClick(e: any) {
  e.stopPropagation();
  e.preventDefault();
}

const dnsProviderTypeDict = Dicts.dnsProviderTypeDict;
const challengeTypeDict = Dicts.challengeTypeDict;

const router = useRouter();
function openDomainManager(e: any) {
  e.preventDefault();
  // router.push("/cert/cert/domain");
  openRouteInNewWindow("/cert/cert/domain");
}

const openDomainImportManageDialog = useDomainImportManage();
function openDomainImportDialog() {
  openDomainImportManageDialog({
    afterSubmit: res => {
      refreshOptions();
    },
  });
}
const dropdownStyle = ref({
  zIndex: 2000,
});

onMounted(() => {
  // 兼容历史数据中带逗号、空项或重复的域名
  const normalized = normalizeDomains(props.value);
  if (normalized.length !== (props.value || []).length) {
    emit("update:value", normalized);
  }
  refreshOptions();
});

function tagRender(tag: { value: string; label: string; closable: boolean; onClose: any; option: any }) {
  const value = String(tag.value ?? tag.label);
  return (
    <a-tag
      closable={tag.closable}
      onClose={tag.onClose}
      type="primary"
      color={isAllowedDomain(value) ? "green" : "red"}
      title="点击编辑"
      class="domain-select-tag"
      onClick={async (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        await editTag(value);
      }}
    >
      {tag.label}
    </a-tag>
  );
}

async function copySelectedDomains(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
  const domains = normalizeDomains(props.value).join(",");
  if (!domains) {
    return;
  }
  await copy(domains);
  notification.success({ message: "复制成功" });
}
</script>

<style lang="less">
.domain-select {
  .domain-select-tag {
    font-size: 14px;
    height: 24px;
    margin-right: 4px;
    margin-top: 2px;
    margin-bottom: 2px;
    cursor: pointer;
    // background-color: rgba(50, 54, 57, 0.06);
  }
  .domain-select-copy-icon {
    cursor: pointer;
  }
}
</style>
