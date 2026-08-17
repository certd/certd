<template>
  <div class="plugin-author-field">
    <a-input :value="modelValue" placeholder="请输入作者名称" @update:value="emit('update:modelValue', $event)" />
    <a-button type="link" size="small" :loading="loading" @click="registerAuthor">注册作者</a-button>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from "vue";
import * as api from "../api";
import { usePluginPublish } from "../use-publish";

defineOptions({ name: "PluginAuthorField" });

const props = defineProps<{ modelValue?: string }>();
const emit = defineEmits<{ (event: "update:modelValue", value: string): void }>();
const loading = ref(false);
const { registerPluginAuthor } = usePluginPublish();
const isLocalAuthor = computed(() => {
  return (
    String(props.modelValue || "")
      .trim()
      .toLowerCase() === "local"
  );
});

async function loadAuthor() {
  loading.value = true;
  try {
    const result = await api.OnlinePluginAuthorGet();
    if ((!props.modelValue || isLocalAuthor.value) && result.author?.name) {
      emit("update:modelValue", result.author.name);
    }
  } catch {
    // 作者为非必填项，未绑定账号或尚未注册作者时保持为空。
  } finally {
    loading.value = false;
  }
}

async function registerAuthor() {
  const author = await registerPluginAuthor();
  if (!author?.name) {
    return;
  }
  emit("update:modelValue", author.name);
}

onMounted(async () => {
  if (isLocalAuthor.value) {
    emit("update:modelValue", "");
  }
  await loadAuthor();
});
</script>

<style lang="less">
.plugin-author-field {
  display: flex;
  min-height: 32px;
  align-items: center;
  gap: 6px;

  .ant-input {
    min-width: 0;
    flex: 1;
  }
}
</style>
