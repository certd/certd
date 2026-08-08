<template>
  <div class="pem-input">
    <FileInput v-bind="fileInput" class="mb-5" type="primary" text="选择文件" @change="onChange" />
    <a-textarea placeholder="或直接粘贴" v-bind="textarea" :value="modelValue" @update:value="emitValue"></a-textarea>
  </div>
</template>

<script setup lang="ts">
import { notification } from "ant-design-vue";
import { ref, watch, defineEmits } from "vue";
import FileInput from "/@/components/file-input.vue";

const props = defineProps<{
  modelValue?: string;
  textarea?: any;
  fileInput?: any;
}>();

const emit = defineEmits(["update:modelValue"]);

function emitValue(value: string) {
  emit("update:modelValue", value);
}

function onChange(e: any) {
  const file = e.target.files[0];
  const size = file.size;
  if (size > 100 * 1024) {
    notification.error({
      message: "文件超过100k，请选择正确的文件",
    });
    return;
  }
  const fileReader = new FileReader();
  fileReader.onload = function (e: any) {
    const value = e.target.result;
    emitValue(value);
  };
  fileReader.readAsText(file); // 以文本形式读取文件
}
</script>

<style lang="less">
.pem-input {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
</style>
