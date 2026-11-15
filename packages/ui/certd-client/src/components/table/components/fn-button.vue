<template>
  <span v-if="resolvedProps.show !== false" class="fn-button-wrap" :class="{ 'fn-button-open': menuOpen }" :style="buttonStyle">
    <button v-if="buttonType !== 'dropdown'" class="fn-button" :class="buttonClasses" :type="nativeType" :disabled="disabled || loading" :aria-busy="loading || undefined" :title="tooltipTitle" @click="handleClick">
      <span v-if="loading" class="fn-button-spinner" aria-hidden="true"></span>
      <FnIcon v-else-if="iconComponent" :icon="iconComponent" />
      <span v-if="text" class="fn-button-label">{{ text }}</span>
    </button>
    <template v-else>
      <button class="fn-button" :class="buttonClasses" type="button" :disabled="disabled || loading" :title="tooltipTitle" :aria-expanded="menuOpen" aria-haspopup="menu" @click="toggleMenu">
        <span v-if="loading" class="fn-button-spinner" aria-hidden="true"></span>
        <FnIcon v-else-if="iconComponent" :icon="iconComponent" />
        <span v-if="text" class="fn-button-label">{{ text }}</span>
        <ChevronDown :size="14" />
      </button>
      <div v-if="menuOpen" class="fn-button-menu" role="menu">
        <button v-for="item in visibleItems" :key="item.key" class="fn-button-menu-item" :class="{ danger: item.danger }" type="button" role="menuitem" :disabled="item.disabled" @click="handleMenuClick(item)">
          {{ item.label }}
        </button>
      </div>
    </template>
  </span>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { ChevronDown } from "@lucide/vue";
import type { CSSProperties } from "vue";
import FnIcon from "./fn-icon.vue";
import type { FnButtonItem, FnButtonProps } from "../types/index";

const props = withDefaults(defineProps<FnButtonProps>(), { type: "primary", shape: "default", buttonType: "button", loading: false, disabled: false, danger: false, items: () => [] });
const emit = defineEmits<{ click: []; select: [key: string] }>();
const context = computed(() => props.context || { type: "row" as const });
const resolvedProps = computed(() => ({ show: props.show, text: props.text, disabled: props.disabled, danger: props.danger, items: props.items || [] }));
const tooltipTitle = computed(() => (typeof props.tooltip === "string" ? props.tooltip : props.tooltip?.title));
const iconComponent = computed(() => props.icon);
const text = computed(() => resolvedProps.value.text);
const buttonType = computed(() => props.buttonType);
const items = computed(() => resolvedProps.value.items);
const visibleItems = computed(() => items.value.filter(item => item.show !== false));
const menuOpen = ref(false);
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
function toggleMenu(): void {
  if (!props.disabled && !props.loading) {
    menuOpen.value = !menuOpen.value;
  }
}
function handleMenuClick(item: FnButtonItem): void {
  if (item.disabled) {
    return;
  }
  menuOpen.value = false;
  const onClick = item.click || item.onClick;
  onClick?.(context.value);
  emit("select", item.key);
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
    color: #344054;
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
    color: #fff;
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
  .fn-button-menu {
    position: absolute;
    z-index: 50;
    top: calc(100% + 5px);
    right: 0;
    min-width: 144px;
    padding: 4px;
    border: 1px solid #e1e6ed;
    border-radius: 7px;
    background: #fff;
    box-shadow: 0 8px 24px rgba(16, 24, 40, 0.14);
  }
  .fn-button-menu-item {
    display: flex;
    width: 100%;
    min-height: 32px;
    align-items: center;
    padding: 0 9px;
    border: 0;
    border-radius: 4px;
    color: #344054;
    background: transparent;
    cursor: pointer;
    text-align: left;
    font: inherit;
    &:hover:not(:disabled) {
      background: #f2f4f7;
    }
    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    &.danger {
      color: #c82333;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .fn-button {
      transition: none;
    }
  }
  .dark & {
    .fn-button {
      color: #d8dee8;
    }
    .fn-button-primary {
      color: #fff;
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
    .fn-button-menu {
      border-color: #414a58;
      background: #232a34;
    }
    .fn-button-menu-item {
      color: #d8dee8;
      &:hover:not(:disabled) {
        background: #303946;
      }
      &.danger {
        color: #ff7b87;
      }
    }
  }
}
@keyframes fn-button-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
