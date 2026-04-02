<template>
  <div class="notification-selector">
    <div class="flex-o w-100">
      <fs-dict-select class="flex-1" :value="modelValue" :dict="optionsDictRef" :disabled="disabled" :render-label="renderLabel" :slots="selectSlots" :allow-clear="true" v-bind="select" @update:value="onChange" />
      <fs-table-select
        ref="tableSelectRef"
        class="flex-0"
        :model-value="modelValue"
        :dict="optionsDictRef"
        :create-crud-options="createCrudOptions"
        :crud-options-override="{
          search: { show: false },
          table: {
            scroll: {
              x: 540,
            },
          },
        }"
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
          <fs-button class="ml-5" :disabled="disabled" :size="size" type="primary" icon="ant-design:edit-outlined" @click="scope.open"></fs-button>
        </template>
      </fs-table-select>
    </div>
  </div>
</template>

<script lang="tsx" setup>
import { inject, ref, Ref, watch } from "vue";
import { createNotificationApi } from "../api";
import { message } from "ant-design-vue";
import { dict } from "@fast-crud/fast-crud";
import createCrudOptions from "../crud";
import { notificationProvide } from "/@/views/certd/notification/common";
import { useUserStore } from "/@/store/user";
import { useI18n } from "/src/locales";
import { useProjectStore } from "/@/store/project";

const { t } = useI18n();

defineOptions({
  name: "NotificationSelector",
});

const props = defineProps<{
  modelValue?: number | string | number[] | string[];
  type?: string;
  placeholder?: string;
  size?: string;
  disabled?: boolean;
  select?: any;
  tableSelect?: any;
}>();

const onChange = async (value: number) => {
  await emitValue(value);
};

const emit = defineEmits(["update:modelValue", "selectedChange", "change"]);

const api = createNotificationApi();
notificationProvide(api);
// const types = ref({});
// async function loadNotificationTypes() {
//   const types = await api.GetDefineTypes();
//   const map: any = {};
//   for (const item of types) {
//     map[item.type] = item;
//   }
//   types.value = map;
// }
// loadNotificationTypes();
const tableSelectRef = ref();
const optionsDictRef = dict({
  url: "/pi/notification/options",
  value: "id",
  label: "name",
  onReady: ({ dict }) => {
    const data = [
      {
        id: 0,
        name: t("certd.notificationDefault"),
        icon: "ion:notifications",
      },
      ...dict.data,
    ];
    dict.setData(data);
  },
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
const projectStore = useProjectStore();
async function emitValue(value: any) {
  // target.value = optionsDictRef.dataMap[value];
  const userId = userStore.userInfo.id;
  const isEnterprice = projectStore.isEnterprise;

  if (isEnterprice) {
    const projectId = projectStore.currentProjectId;
    if (pipeline?.value?.projectId !== projectId) {
      message.error("对不起，您不能修改其他项目流水线的通知");
      return;
    }
  } else {
    if (pipeline?.value?.userId !== userId) {
      message.error("对不起，您不能修改他人流水线的通知");
      return;
    }
  }
  emit("change", value);
  emit("update:modelValue", value);
}

watch(
  () => {
    return props.modelValue;
  },
  async value => {
    await optionsDictRef.loadDict();
    //@ts-ignore
    target.value = optionsDictRef.dataMap[value];
    emit("selectedChange", target.value);
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
.notification-selector {
  width: 100%;
}
</style>
