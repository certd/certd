<template>
  <div>
    <fs-form-item
      v-model="optionsFormState.receivers"
      :item="{
        title: '收件邮箱',
        key: 'type',
        component: {
          name: 'a-select',
          vModel: 'value',
          mode: 'tags',
          open: false
        },
        helper: '输入你的收件邮箱地址，支持多个邮箱',
        rules: [{ required: true, message: '此项必填' }]
      }"
    />

    <a-alert v-if="!settingStore.isPlus" class="m-1" type="info">
      <template #message> 还没有配置邮件服务器？<router-link :to="{ path: '/sys/settings/email' }">现在就去</router-link> </template>
    </a-alert>
  </div>
</template>
<script lang="ts" setup>
import { Ref, ref, watch } from "vue";
import { useUserStore } from "/@/store/modules/user";
import { useSettingStore } from "/@/store/modules/settings";

const props = defineProps({
  options: {
    type: Object as PropType<any>,
    default: () => {}
  }
});

const settingStore = useSettingStore();

const optionsFormState: Ref<any> = ref({});

watch(
  () => {
    return props.options;
  },
  () => {
    optionsFormState.value = {
      ...props.options
    };
  },
  {
    immediate: true
  }
);

const emit = defineEmits(["change"]);
function doEmit() {
  emit("change", { ...optionsFormState.value });
}

function getValue() {
  return { ...optionsFormState.value };
}

defineExpose({
  doEmit,
  getValue
});
</script>
