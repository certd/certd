<template>
  <div class="fn-config-provider">
    <component :is="props.themeBridge" v-if="props.themeBridge" />
    <FnModalProvider><slot /></FnModalProvider>
    <Teleport to="body">
      <div v-if="props.ui === 'fn'" class="fn-feedback-stack" aria-live="polite" aria-atomic="false">
        <div v-for="item in feedbackItems" :key="item.id" class="fn-feedback" :class="`fn-feedback--${item.type}`">{{ item.content }}</div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, type Component } from "vue";
import { uiContext } from "@fast-crud/fast-crud";
import FnModalProvider from "../modal/fn-modal-provider.vue";
import { provideFnUiServices, type FnUiServices } from "./context";

const props = withDefaults(defineProps<{ ui?: "fn" | "antdv"; themeBridge?: Component }>(), { ui: "fn" });
const feedbackItems = ref<Array<{ id: number; type: string; content: string }>>([]);
let feedbackId = 0;

const fallbackServices: FnUiServices = {
  notification: {
    success: options => showFallback("success", options),
    error: options => showFallback("error", options),
    warning: options => showFallback("warning", options),
    warn: options => showFallback("warning", options),
    info: options => showFallback("info", options),
    open: options => showFallback(options?.type || "info", options),
  },
  message: {
    success: options => showFallback("success", options),
    error: options => showFallback("error", options),
    warning: options => showFallback("warning", options),
    warn: options => showFallback("warning", options),
    info: options => showFallback("info", options),
    open: options => showFallback(options?.type || "info", options),
    loading: options => showFallback("loading", options),
  },
};

provideFnUiServices(props.ui === "antdv" ? getAntdvServices() : fallbackServices);

function getAntdvServices(): FnUiServices {
  const ui = uiContext.get();
  return {
    notification: { ...ui.notification, warning: ui.notification.warn, warn: ui.notification.warn },
    message: { ...ui.message, warning: ui.message.warn, warn: ui.message.warn },
  };
}

function showFallback(type: string, options: any): void {
  const content = typeof options === "string" ? options : options?.message || options?.content || options?.description || "";
  const item = { id: ++feedbackId, type, content: String(content) };
  feedbackItems.value.push(item);
  window.setTimeout(() => {
    feedbackItems.value = feedbackItems.value.filter(current => current.id !== item.id);
  }, 3000);
}
</script>

<style lang="less">
.fn-config-provider {
  display: contents;
  .fn-feedback-stack {
    position: fixed;
    z-index: 3000;
    top: 16px;
    left: 50%;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transform: translateX(-50%);
    pointer-events: none;
  }
  .fn-feedback {
    max-width: min(420px, calc(100vw - 32px));
    padding: 10px 16px;
    border: 1px solid var(--fn-color-border);
    border-radius: var(--fn-border-radius);
    background: var(--fn-color-bg-elevated);
    color: var(--fn-color-text);
    box-shadow: 0 4px 14px rgb(0 0 0 / 12%);
  }
  .fn-feedback--success {
    border-inline-start: 3px solid #52c41a;
  }
  .fn-feedback--error {
    border-inline-start: 3px solid var(--fn-color-error);
  }
  .fn-feedback--warning {
    border-inline-start: 3px solid #faad14;
  }
}
</style>
