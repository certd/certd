<template>
  <template v-if="resolvedProps.show !== false">
    <a-tooltip v-if="tooltipTitle" :title="tooltipTitle">
      <a-dropdown v-if="buttonType === 'dropdown'" :trigger="['click']">
        <a-button v-bind="buttonProps" @click.prevent>
          <template v-if="icon || buttonType === 'dropdown'" #icon>
            <FnIcon v-if="iconComponent" :icon="iconComponent" />
            <FnIcon v-else :icon="ChevronDown" :size="14" />
          </template>
          <span v-if="text">{{ text }}</span>
        </a-button>
        <template #overlay>
          <a-menu @click="handleMenuClick">
            <a-menu-item v-for="item in visibleItems" :key="item.key" :disabled="item.disabled" :danger="item.danger">{{ item.label }}</a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
      <a-button v-else v-bind="buttonProps" @click="handleClick">
        <template v-if="icon || buttonType === 'dropdown'" #icon>
          <FnIcon v-if="iconComponent" :icon="iconComponent" />
          <FnIcon v-else :icon="ChevronDown" :size="14" />
        </template>
        <span v-if="text">{{ text }}</span>
      </a-button>
    </a-tooltip>
    <a-dropdown v-else-if="buttonType === 'dropdown'" :trigger="['click']">
      <a-button v-bind="buttonProps" @click.prevent>
        <template v-if="icon || buttonType === 'dropdown'" #icon>
          <FnIcon v-if="iconComponent" :icon="iconComponent" />
          <FnIcon v-else :icon="ChevronDown" :size="14" />
        </template>
        <span v-if="text">{{ text }}</span>
      </a-button>
      <template #overlay>
        <a-menu @click="handleMenuClick">
          <a-menu-item v-for="item in visibleItems" :key="item.key" :disabled="item.disabled" :danger="item.danger">{{ item.label }}</a-menu-item>
        </a-menu>
      </template>
    </a-dropdown>
    <a-button v-else v-bind="buttonProps" @click="handleClick">
      <template v-if="icon" #icon><FnIcon :icon="iconComponent" /></template>
      <span v-if="text">{{ text }}</span>
    </a-button>
  </template>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { ChevronDown } from "@lucide/vue";
import FnIcon from "./fn-icon.vue";
import type { FnButtonProps } from "./types";

const props = withDefaults(defineProps<FnButtonProps>(), { type: "primary", shape: "default", buttonType: "button", loading: false, disabled: false, danger: false, items: () => [] });
const emit = defineEmits<{ click: []; select: [key: string] }>();
const context = computed(() => props.context || { type: "row" as const });
const resolvedProps = computed(() => ({ show: props.show, text: props.text, disabled: props.disabled, danger: props.danger, items: props.items || [] }));
const buttonProps = computed(() => ({ type: props.type, shape: props.shape, loading: props.loading, disabled: props.disabled, danger: props.danger }));
const tooltipTitle = computed(() => (typeof props.tooltip === "string" ? props.tooltip : props.tooltip?.title));
const iconComponent = computed(() => props.icon);
const text = computed(() => resolvedProps.value.text);
const icon = computed(() => props.icon);
const buttonType = computed(() => props.buttonType);
const items = computed(() => resolvedProps.value.items);
const visibleItems = computed(() => items.value.filter(item => item.show !== false));
function handleClick(): void {
  const onClick = props.click || props.onClick;
  if (onClick) {
    onClick(context.value);
  } else {
    emit("click");
  }
}
function handleMenuClick({ key }: { key: string }): void {
  const item = items.value.find(option => option.key === key);
  const onClick = item?.click || item?.onClick;
  onClick?.(context.value);
  emit("select", key);
}
</script>
