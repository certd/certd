<template>
  <div class="addon-selector">
    <div class="flex-o w-100 inner">
      <!--      <fs-dict-select class="flex-1" :value="modelValue" :dict="optionsDictRef" :disabled="disabled" :render-label="renderLabel" :slots="selectSlots" :allow-clear="true" v-bind="select" @update:value="onChange" />-->
      <span v-if="modelValue" class="mr-5 cd-flex-inline">
        <a-tag class="mr-5" color="green">{{ target?.name || modelValue }}</a-tag>
        <fs-icon class="cd-icon-button" icon="ion:close-circle-outline" @click="clear"></fs-icon>
      </span>
      <span v-else class="mlr-5 text-gray">{{ placeholder || t("certd.addonSelector.placeholder") }}</span>
      <fs-table-select
        ref="tableSelectRef"
        class="flex-0"
        :model-value="modelValue"
        :dict="optionsDictRef"
        :create-crud-options="createCrudOptionsWithApi"
        :crud-options-override="{
          search: { show: false },
          table: {
            scroll: {
              x: 540,
            },
          },
        }"
        :disabled="disabled"
        :show-current="false"
        :show-select="false"
        :dialog="{ width: 960 }"
        :destroy-on-close="false"
        height="400px"
        v-bind="tableSelect"
        @update:model-value="onChange"
        @dialog-closed="doRefresh"
      >
        <template #default="scope">
          <fs-button class="ml-5" :disabled="disabled" :size="size" type="primary" :text="t('certd.addonSelector.select')" @click="scope.open" />
        </template>
      </fs-table-select>
    </div>
  </div>
</template>

<script lang="tsx" setup>
import { inject, ref, Ref, watch } from "vue";
import { createAddonApi } from "../api";
import { message } from "ant-design-vue";
import { dict } from "@fast-crud/fast-crud";
import createCrudOptions from "../crud";
import { addonProvide } from "../common";
import { useUserStore } from "/@/store/user";
import { useI18n } from "/src/locales";

const { t } = useI18n();

defineOptions({
  name: "AddonSelector",
});

const props = defineProps<{
  modelValue?: number | string | number[] | string[];
  type?: string;
  placeholder?: string;
  size?: string;
  disabled?: boolean;
  select?: any;
  tableSelect?: any;
  addonType: string;
  from?: string;
}>();

const onChange = async (value: number) => {
  await emitValue(value);
};

const emit = defineEmits(["update:modelValue", "selected-change", "change"]);

const api = createAddonApi({
  from: props.from,
  addonType: props.addonType,
});
addonProvide(api);

function createCrudOptionsWithApi(opts: any) {
  opts.context = {
    api,
    addonType: props.addonType,
    type: props.type,
  };
  return createCrudOptions(opts);
}

const tableSelectRef = ref();
const optionsDictRef = dict({
  url: `/addon/options?addonType=${props.addonType}`,
  value: "id",
  label: "name",
});

const renderLabel = (option: any) => {
  return <span>{option.name}</span>;
};

async function openTableSelectDialog() {
  selectOpened.value = false;
  await tableSelectRef.value.open({});
  await tableSelectRef.value.crudExpose.openAdd({});
}

const selectOpened = ref(false);
const selectSlots = ref({
  dropdownRender({ menuNode, props }: any) {
    const res = [];
    res.push(menuNode);
    // res.push(<a-divider style="margin: 4px 0" />);
    // res.push(<a-space style="padding: 4px 8px" />);
    // res.push(<fs-button class="w-100" type="text" icon="plus-outlined" text="新建通知渠道" onClick={openTableSelectDialog}></fs-button>);
    return res;
  },
});

const target: Ref<any> = ref({});

function clear() {
  if (props.disabled) {
    return;
  }
  emitValue(null);
}

const userStore = useUserStore();

async function emitValue(value: any) {
  // target.value = optionsDictRef.dataMap[value];
  const userId = userStore.userInfo.id;
  if (pipeline?.value && pipeline.value.userId !== userId) {
    message.error(`对不起，您不能修改他人流水线的${props.addonType}设置`);
    return;
  }
  emit("change", value);
  emit("update:modelValue", value);
}

async function refreshTarget(value: any) {
  if (value > 0) {
    target.value = await api.GetSimpleInfo(value);
  } else {
    target.value = {
      //captchaType会监听此字段，给个默认值
      type: "",
    };
  }
  debugger
}

watch(
  () => {
    return props.modelValue;
  },
  async value => {
    // await optionsDictRef.loadDict();
    //@ts-ignore
    await refreshTarget(value);
    // target.value = optionsDictRef.dataMap[value];
    emit("selected-change", target.value);
  },
  {
    immediate: true,
  }
);

//当不在pipeline中编辑时，可能为空
const pipeline = inject("pipeline", null);

async function doRefresh() {
  await optionsDictRef.reloadDict();
}
</script>
<style lang="less">
.addon-selector {
  width: 100%;
  .inner {
    display: flex;
    align-items: center;
  }
}
</style>
