<template>
  <div class="domain-select">
    <div class="flex flex-row">
      <a-select class="domain-select-input" show-search :filter-option="filterOption" :options="optionsRef" :value="value" v-bind="attrs" @click="onClick" @update:value="emit('update:value', $event)">
        <template #dropdownRender="{ menuNode }">
          <template v-if="search">
            <div class="flex w-full" style="padding: 4px 8px">
              <a-input
                ref="inputRef"
                v-model:value="searchKeyRef"
                class="flex-1"
                allow-clear
                placeholder="这里可以搜索域名（数据来自设置->域名管理），列表中没有的域名可以直接在上面输入框输入"
                @keydown.enter="doSearch"
              />
              <a-button class="ml-2" :loading="loading" type="text" @click="doSearch">
                <template #icon>
                  <search-outlined />
                </template>
                查询
              </a-button>
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
      </a-select>
      <div class="ml-5">
        <fs-button :loading="loading" title="刷新我的域名列表" icon="ion:refresh-outline" @click="refreshOptions"></fs-button>
      </div>
    </div>
    <div class="helper" :class="{ error: hasError }">
      {{ message }}
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, defineComponent, ref, Ref, useAttrs } from "vue";
import { request } from "/@/api/service";

defineOptions({
  name: "DomainSelector",
});

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
}>();

const emit = defineEmits<{
  "update:value": any;
}>();

const attrs = useAttrs();

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
      });
      options.push({
        value: `*.${item.domain}`,
        label: `*.${item.domain}`,
      });
    }

    optionsRef.value = options;
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
</script>

<style lang="less"></style>
