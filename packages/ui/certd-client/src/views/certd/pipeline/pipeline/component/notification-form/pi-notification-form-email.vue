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
          mode: 'tags'
        },
        rules: [{ required: true, message: '此项必填' }]
      }"
    />

    <a-alert class="m-1" type="info">
      <template #message> 还没有配置邮件服务器？<router-link :to="{ path: '/certd/settings/email' }">现在就去</router-link> </template>
    </a-alert>
  </div>
</template>
<script lang="ts" setup>
import { Ref, ref, watch } from "vue";

const props = defineProps({
  options: {
    type: Object as PropType<any>,
    default: () => {}
  }
});

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
