<template>
  <div class="fn-form-item" :class="{ 'fn-form-item-error': error }">
    <label v-if="label" class="fn-form-item-label" :for="htmlFor">{{ label }}</label>
    <div class="fn-form-item-control">
      <slot />
      <div v-if="error" class="fn-form-item-error-message" role="alert">{{ error }}</div>
      <div v-else-if="help" class="fn-form-item-help">{{ help }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label?: string; error?: string; help?: string; htmlFor?: string }>();
</script>

<style lang="less">
.fn-form-item {
  display: flex;
  min-width: 0;
  margin-bottom: 16px;
  gap: 12px;

  .fn-form-item-label {
    flex: 0 0 var(--fn-form-label-width, 120px);
    padding-top: 6px;
    color: #344054;
    text-align: right;
  }

  .fn-form-item-control {
    flex: 1;
    min-width: 0;
  }

  .fn-form-item-help,
  .fn-form-item-error-message {
    margin-top: 4px;
    font-size: 12px;
  }

  .fn-form-item-help {
    color: #98a2b1;
  }

  .fn-form-item-error-message {
    color: #dc3545;
  }

  &.fn-form-item-error :deep(.fn-input) {
    border-color: #dc3545;
  }

  .dark & {
    .fn-form-item-label {
      color: #d8dee8;
    }
    .fn-form-item-help {
      color: #98a2b1;
    }
  }
}
</style>
