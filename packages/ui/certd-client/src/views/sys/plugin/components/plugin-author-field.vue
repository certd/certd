<template>
  <div class="plugin-author-field">
    <span v-if="authorName" class="plugin-author-field__name">{{ authorName }}</span>
    <a-button v-else type="link" size="small" :loading="loading" @click="registerAuthor">注册作者</a-button>
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
const registeredAuthor = ref<api.OnlinePluginAuthorBean>();
const { registerPluginAuthor } = usePluginPublish();
const authorName = computed(() => props.modelValue || registeredAuthor.value?.name || "");

async function loadAuthor() {
  loading.value = true;
  try {
    const result = await api.OnlinePluginAuthorGet();
    registeredAuthor.value = result.author;
    if (!props.modelValue && result.author?.name) {
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
  registeredAuthor.value = author;
  emit("update:modelValue", author.name);
}

onMounted(loadAuthor);
</script>

<style lang="less">
.plugin-author-field {
  display: flex;
  min-height: 32px;
  align-items: center;

  &__name {
    color: #1f2937;
  }
}
</style>
