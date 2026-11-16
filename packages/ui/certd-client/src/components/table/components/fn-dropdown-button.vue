<template>
  <span v-if="show !== false" class="fn-button-wrap" :class="{ 'fn-button-open': menuOpen }" :style="buttonStyle">
    <button
      ref="buttonRef"
      class="fn-button"
      :class="buttonClasses"
      type="button"
      :disabled="disabled || loading"
      :aria-label="!text ? tooltipTitle : undefined"
      :title="tooltipTitle"
      :aria-expanded="menuOpen"
      aria-haspopup="menu"
      @click="toggleMenu"
    >
      <span v-if="loading" class="fn-button-spinner" aria-hidden="true"></span>
      <FnIcon v-else-if="icon" :icon="icon" />
      <span v-if="text" class="fn-button-label">{{ text }}</span>
      <ChevronDown :size="14" />
    </button>
    <Teleport to="body">
      <template v-if="menuOpen">
        <div class="fn-button-menu-mask" aria-hidden="true" @click="closeMenu"></div>
        <div ref="menuRef" class="fn-button-menu" :data-size="menuSize" :style="menuStyle" role="menu">
          <button v-for="item in visibleItems" :key="item.key" class="fn-button-menu-item" :class="{ danger: item.danger }" type="button" role="menuitem" :disabled="item.disabled" @click="handleMenuClick(item)">
            {{ item.label }}
          </button>
        </div>
      </template>
    </Teleport>
  </span>
</template>

<script setup lang="ts">
import { ChevronDown } from "@lucide/vue";
import { computed, getCurrentInstance, inject, nextTick, onBeforeUnmount, ref, watch, type CSSProperties } from "vue";
import FnIcon from "./fn-icon.vue";
import type { FnButtonItem, FnButtonProps } from "../types/index";
import { fnTableSizeKey } from "../provider/context";

const props = withDefaults(defineProps<FnButtonProps>(), { type: "primary", shape: "default", loading: false, disabled: false, danger: false, items: () => [] });
const emit = defineEmits<{ select: [key: string] }>();
const tableSize = inject(fnTableSizeKey, undefined);
const context = computed(() => props.context || { type: "row" as const });
const tooltipTitle = computed(() => (typeof props.tooltip === "string" ? props.tooltip : props.tooltip?.title));
const visibleItems = computed(() => (props.items || []).filter(item => item.show !== false));
const menuOpen = ref(false);
const buttonRef = ref<HTMLElement>();
const menuRef = ref<HTMLElement>();
const menuStyle = ref<CSSProperties>({});
const menuSize = ref<"small" | "middle">("middle");
const buttonClasses = computed(() => ({
  [`fn-button-${props.type}`]: true,
  [`fn-button-shape-${props.shape}`]: true,
  "fn-button-danger": props.danger,
  "fn-button-disabled": props.disabled || props.loading,
  "fn-button-icon-only": !props.text && Boolean(props.icon),
}));
const buttonStyle = computed<CSSProperties>(() => (props.primaryColor ? ({ "--fn-button-primary": props.primaryColor } as CSSProperties) : {}));

function toggleMenu(): void {
  if (!props.disabled && !props.loading) {
    menuOpen.value = !menuOpen.value;
  }
}
function closeMenu(): void {
  menuOpen.value = false;
}
function updateMenuPosition(): void {
  const button = buttonRef.value;
  if (!button) {
    return;
  }
  const rect = button.getBoundingClientRect();
  const fontSize = tableSize?.value.size ? `${tableSize.value.size}px` : "";
  const controlHeight = tableSize?.value.size ? `${tableSize.value.size + 18}px` : "";
  const itemHeight = Number.parseFloat(controlHeight) || 32;
  menuSize.value = itemHeight < 32 ? "small" : "middle";
  const estimatedHeight = Math.max(1, visibleItems.value.length) * itemHeight + 10;
  const opensUpward = rect.bottom + 5 + estimatedHeight > window.innerHeight && rect.top - 5 - estimatedHeight >= 0;
  const top = opensUpward ? rect.top - estimatedHeight - 5 : rect.bottom + 5;
  const width = menuRef.value?.offsetWidth || 144;
  const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
  menuStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    ...(fontSize ? { "--fn-button-menu-font-size": fontSize } : {}),
    ...(controlHeight ? { "--fn-button-menu-item-height": controlHeight } : {}),
  } as CSSProperties;
}
function handleViewportChange(): void {
  if (menuOpen.value) {
    updateMenuPosition();
  }
}
watch(menuOpen, async open => {
  if (open) {
    await nextTick();
    updateMenuPosition();
    window.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("resize", handleViewportChange);
  } else {
    window.removeEventListener("scroll", handleViewportChange, true);
    window.removeEventListener("resize", handleViewportChange);
  }
});
if (getCurrentInstance()) {
  onBeforeUnmount(() => {
    window.removeEventListener("scroll", handleViewportChange, true);
    window.removeEventListener("resize", handleViewportChange);
  });
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
.fn-button-menu {
  position: fixed;
  z-index: 50;
  min-width: 144px;
  max-height: calc(100vh - 16px);
  overflow-y: auto;
  padding: 4px;
  border: 1px solid #e1e6ed;
  border-radius: 7px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(16, 24, 40, 0.14);
  font-size: var(--fn-button-menu-font-size, inherit);
}
.fn-button-menu-mask {
  position: fixed;
  z-index: 49;
  inset: 0;
  background: transparent;
}
.fn-button-menu-item {
  display: flex;
  width: 100%;
  min-height: var(--fn-button-menu-item-height, 32px);
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
.fn-button-menu[data-size="small"] .fn-button-menu-item {
  padding-right: 8px;
  padding-left: 8px;
}
body.dark .fn-button-menu {
  border-color: #414a58;
  background: #232a34;
}
body.dark .fn-button-menu-item {
  color: #d8dee8;
  &:hover:not(:disabled) {
    background: #303946;
  }
  &.danger {
    color: #ff7b87;
  }
}
</style>
