<template>
  <FnDropdownButton v-if="resolvedProps.show !== false && buttonType === 'dropdown'" v-bind="props" @select="emit('select', $event)" />
  <span v-else-if="resolvedProps.show !== false" class="fn-button-wrap" :style="buttonStyle">
    <button
      v-if="buttonType !== 'dropdown'"
      class="fn-button"
      :class="buttonClasses"
      :type="nativeType"
      :disabled="disabled || loading"
      :aria-busy="loading || undefined"
      :aria-label="!text ? tooltipTitle : undefined"
      :title="tooltipTitle"
      @click="handleClick"
    >
      <span v-if="loading" class="fn-button-spinner" aria-hidden="true"></span>
      <FnIcon v-else-if="iconComponent" :icon="iconComponent" />
      <span v-if="text" class="fn-button-label">{{ text }}</span>
    </button>
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { CSSProperties } from "vue";
import FnIcon from "./fn-icon.vue";
import FnDropdownButton from "./fn-dropdown-button.vue";
import type { FnButtonProps } from "../types/index";

const props = withDefaults(defineProps<FnButtonProps>(), { show: undefined, type: "primary", shape: "default", buttonType: "button", loading: false, disabled: false, danger: false, items: () => [] });
const emit = defineEmits<{ click: []; select: [key: string] }>();
const context = computed(() => props.context || { type: "row" as const });
const resolvedProps = computed(() => ({ show: props.show, text: props.text, disabled: props.disabled, danger: props.danger, items: props.items || [] }));
const tooltipTitle = computed(() => (typeof props.tooltip === "string" ? props.tooltip : props.tooltip?.title));
const iconComponent = computed(() => props.icon);
const text = computed(() => resolvedProps.value.text);
const buttonType = computed(() => props.buttonType);
const nativeType = computed(() => (props.type === "submit" || props.type === "reset" ? props.type : "button"));
const buttonClasses = computed(() => ({
  [`fn-button-${props.type}`]: true,
  [`fn-button-shape-${props.shape}`]: true,
  "fn-button-danger": props.danger,
  "fn-button-disabled": props.disabled || props.loading,
  "fn-button-icon-only": !text.value && Boolean(iconComponent.value),
}));
const buttonStyle = computed<CSSProperties>(() => (props.primaryColor ? ({ "--fn-button-primary": props.primaryColor } as CSSProperties) : {}));

function handleClick(): void {
  if (props.disabled || props.loading) {
    return;
  }
  const onClick = props.click || props.onClick;
  if (onClick) {
    onClick(context.value);
  } else {
    emit("click");
  }
}
</script>

<style lang="less">
.fn-button-wrap {
  --fn-button-primary: hsl(var(--primary, 212 100% 45%));
  position: relative;
  display: inline-flex;
  vertical-align: middle;
  .fn-button {
    display: inline-flex;
    min-height: 32px;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 0 12px;
    border: 1px solid transparent;
    border-radius: 6px;
    // color: #344054;
    background: transparent;
    cursor: pointer;
    font: inherit;
    line-height: 1.4;
    white-space: nowrap;
    transition:
      color 140ms ease,
      background-color 140ms ease,
      border-color 140ms ease,
      box-shadow 140ms ease,
      transform 100ms ease;
    &:focus-visible {
      outline: 2px solid color-mix(in srgb, var(--fn-button-primary) 45%, transparent);
      outline-offset: 2px;
    }
    &:active:not(:disabled) {
      transform: translateY(1px) scale(0.97);
    }
    &:disabled {
      opacity: 0.48;
      cursor: not-allowed;
    }
  }
  .fn-button-label {
    display: inline-block;
  }
  .fn-button-primary {
    border-color: var(--fn-button-primary);
    color: hsl(var(--primary-foreground, 0 0% 98%));
    background: var(--fn-button-primary);
    box-shadow: 0 1px 2px color-mix(in srgb, var(--fn-button-primary) 22%, transparent);
    &:hover:not(:disabled) {
      filter: brightness(1.08);
      box-shadow: 0 3px 9px color-mix(in srgb, var(--fn-button-primary) 30%, transparent);
    }
  }
  .fn-button-default {
    border-color: #d7dee8;
    background: #fff;
    &:hover:not(:disabled) {
      border-color: var(--fn-button-primary);
      color: var(--fn-button-primary);
      background: color-mix(in srgb, var(--fn-button-primary) 5%, white);
    }
  }
  .fn-button-dashed {
    border: 1px dashed #c5ceda;
    background: transparent;
    &:hover:not(:disabled) {
      border-color: var(--fn-button-primary);
      color: var(--fn-button-primary);
      background: color-mix(in srgb, var(--fn-button-primary) 5%, transparent);
    }
  }
  .fn-button-text,
  .fn-button-link {
    color: var(--fn-button-primary);
    &:hover:not(:disabled) {
      background: color-mix(in srgb, var(--fn-button-primary) 9%, transparent);
    }
  }
  .fn-button-link {
    min-height: auto;
    padding: 0;
    text-decoration: none;
  }
  .fn-button-shape-round {
    border-radius: 999px;
  }
  .fn-button-shape-circle {
    width: 32px;
    padding: 0;
    border-radius: 50%;
  }
  .fn-button-icon-only {
    width: 32px;
    padding: 0;
  }
  .fn-button-danger {
    border-color: #dc3545;
    color: #fff;
    background: #dc3545;
    &:hover:not(:disabled) {
      border-color: #c82333;
      background: #c82333;
    }
  }
  .fn-button-text.fn-button-danger,
  .fn-button-link.fn-button-danger {
    border-color: transparent;
    color: #dc3545;
    background: transparent;
    &:hover:not(:disabled) {
      background: rgba(220, 53, 69, 0.09);
    }
  }
  .fn-button-default.fn-button-danger {
    border-color: #f0a0a6;
    color: #c82333;
    background: transparent;
  }
  .fn-button-spinner {
    width: 13px;
    height: 13px;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: fn-button-spin 700ms linear infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .fn-button {
      transition: none;
    }
  }
  .dark & {
    .fn-button {
      // color: #d8dee8;
    }
    .fn-button-default {
      border-color: #424b59;
      background: #232a34;
      &:hover:not(:disabled) {
        color: var(--fn-button-primary);
      }
    }
    .fn-button-dashed {
      border-color: #505a68;
    }
    .fn-button-text,
    .fn-button-link {
      color: color-mix(in srgb, var(--fn-button-primary) 76%, white);
    }
    .fn-button-danger {
      border-color: #c83b4a;
      color: #fff;
      background: #c83b4a;
    }
    .fn-button-default.fn-button-danger {
      color: #ff7b87;
      background: transparent;
    }
  }
}
@keyframes fn-button-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
