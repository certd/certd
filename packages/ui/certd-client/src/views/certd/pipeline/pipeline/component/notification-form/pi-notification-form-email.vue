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
