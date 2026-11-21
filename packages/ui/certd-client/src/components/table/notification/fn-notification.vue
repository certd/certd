<template>
  <div class="fn-notification" aria-live="polite" aria-atomic="false">
    <div v-for="item in items" :key="item.id" class="fn-notification-item" :class="`fn-notification-item--${item.type}`" role="status">
      <div class="fn-notification-item__message">{{ item.message }}</div>
      <div v-if="item.description" class="fn-notification-item__description">{{ item.description }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FnNotificationItem } from "./fn-notification";

defineProps<{ items: FnNotificationItem[] }>();
</script>

<style lang="less">
.fn-notification {
  position: fixed;
  z-index: 3000;
  top: 16px;
  right: 16px;
  display: flex;
  width: min(360px, calc(100vw - 32px));
  flex-direction: column;
  gap: 8px;
  pointer-events: none;

  .fn-notification-item {
    padding: 12px 14px;
    border: 1px solid var(--fn-color-border);
    border-inline-start: 3px solid var(--fn-color-primary);
    border-radius: var(--fn-border-radius);
    background: var(--fn-color-bg-elevated);
    color: var(--fn-color-text);
    box-shadow: 0 4px 14px rgb(16 24 40 / 14%);
  }

  .fn-notification-item--success {
    border-inline-start-color: #16a36b;
  }

  .fn-notification-item--error {
    border-inline-start-color: var(--fn-color-error);
  }

  .fn-notification-item--warning {
    border-inline-start-color: #d99518;
  }

  .fn-notification-item__message {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.45;
  }

  .fn-notification-item__description {
    margin-top: 4px;
    color: var(--fn-color-text-secondary);
    font-size: 12px;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
}
</style>
