<template>
  <div class="domain-select">
    <div class="flex flex-row">
      <a-select
        class="domain-select-input"
        :popup-class-name="popupClassName"
        :dropdown-style="dropdownStyle"
        show-search
        :filter-option="filterOption"
        :options="optionsRef"
        :value="value"
        v-bind="attrs"
        @click="onClick"
        @update:value="emit('update:value', $event)"
      >
        <template #dropdownRender="{ menuNode }">
          <template v-if="search">
            <div class="flex w-full items-center justify-between flex-wrap" style="padding: 4px 8px">
              <div class="flex-1 flex flex-row items-center">
                <a-input ref="inputRef" v-model:value="searchKeyRef" class="flex-1" allow-clear :placeholder="t('certd.pluginCommon.domainSearchPlaceholder')" @keydown.enter="doSearch" />
                <fs-button type="primary" class="m-1" :loading="loading" icon="mingcute:search-2-line" @click="doSearch">{{ t("certd.pluginCommon.search") }}</fs-button>
              </div>
              <div class="manager flex flex-row items-center">
                <fs-button type="primary" class="m-1" icon="mingcute:vip-1-line" @click="openDomainImportDialog">{{ t("certd.pluginCommon.importDomain") }}</fs-button>
                <fs-button class="m-1" type="primary" icon="carbon:gui-management" @click="openDomainManager">{{ t("certd.pluginCommon.manageDomain") }}</fs-button>
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
      <div class="ml-5">
        <fs-button :loading="loading" :title="t('certd.pluginCommon.refreshMyDomains')" icon="ion:refresh-outline" @click="refreshOptions"></fs-button>
      </div>
    </div>
    <div class="helper" :class="{ error: hasError }">
      {{ message }}
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, defineComponent, onMounted, ref, Ref, useAttrs } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { Dicts } from "../lib/dicts";
import { request } from "/@/api/service";
import { openRouteInNewWindow } from "/@/vben/utils";
import { useDomainImportManage } from "/@/views/certd/cert/domain/use";

defineOptions({
  name: "DomainSelector",
});

const { t } = useI18n();

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
const message = ref("");
const hasError = ref(false);
const loading = ref(false);
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
  // router.push("/certd/cert/domain");
  openRouteInNewWindow("/certd/cert/domain");
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
  refreshOptions();
});
</script>

<style lang="less"></style>
