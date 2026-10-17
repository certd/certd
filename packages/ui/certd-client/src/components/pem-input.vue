<template>
  <div class="pem-input">
    <div class="pem-input__dropzone" :class="{ 'pem-input__dropzone--active': isDragging }" @dragenter.prevent="onDragEnter" @dragover.prevent="onDragOver" @dragleave.prevent="onDragLeave" @drop.prevent="onDrop">
      <FileInput v-bind="fileInput" class="pem-input__file" type="primary" text="选择文件" @change="onChange" />
      <span>或将文件拖拽到此处</span>
    </div>
    <a-textarea placeholder="或直接粘贴" v-bind="textarea" :value="modelValue" @update:value="emitValue"></a-textarea>
  </div>
</template>

<script setup lang="ts">
import { notification } from "ant-design-vue";
import { ref, defineEmits } from "vue";
import FileInput from "/@/components/file-input.vue";

const props = defineProps<{
  modelValue?: string;
  textarea?: any;
  fileInput?: any;
}>();

const emit = defineEmits(["update:modelValue"]);
const isDragging = ref(false);

function readFile(file?: File) {
  if (!file) {
    return;
  }

  if (file.size > 100 * 1024) {
    notification.error({
      message: "文件超过100k，请选择正确的文件",
    });
    return;
  }

  const fileReader = new FileReader();
  fileReader.onload = function (event: ProgressEvent<FileReader>) {
    const value = event.target?.result;
    if (typeof value === "string") {
      emitValue(value);
    }
  };
  fileReader.readAsText(file);
}

function onDragEnter() {
  isDragging.value = true;
}

function onDragOver() {
  isDragging.value = true;
}

function onDragLeave(event: DragEvent) {
  const currentTarget = event.currentTarget as HTMLElement;
  const relatedTarget = event.relatedTarget as Node | null;
  if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
    isDragging.value = false;
  }
}

function onDrop(event: DragEvent) {
  isDragging.value = false;
  readFile(event.dataTransfer?.files[0]);
}

function emitValue(value: string) {
  emit("update:modelValue", value);
}

function onChange(e: any) {
  readFile(e.target.files?.[0]);
}
</script>

<style lang="less">
.pem-input {
  display: flex;
  flex-direction: column;
  gap: 5px;

  &__dropzone {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border: 1px dashed #d9d9d9;
    border-radius: 4px;
    transition:
      border-color 0.2s,
      background-color 0.2s;
  }

  &__dropzone--active {
    border-color: #1677ff;
    background-color: #e6f4ff;
  }

  &__file {
    margin-bottom: 0;
  }
}
</style>
