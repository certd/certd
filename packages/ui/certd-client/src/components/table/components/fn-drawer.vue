<template>
  <Teleport to="body">
    <Transition name="fn-drawer">
      <div v-if="open" class="fn-drawer-mask" @mousedown.self="close">
        <section class="fn-drawer" :class="`fn-drawer--${placement}`" :style="drawerStyle" role="dialog" aria-modal="true" :aria-label="title">
          <header class="fn-drawer-header">
            <slot name="header"
              ><h2>{{ title }}</h2></slot
            >
            <button class="fn-drawer-close" type="button" aria-label="关闭" @click="close"><X :size="18" /></button>
          </header>
          <div class="fn-drawer-body"><slot /></div>
          <footer v-if="$slots.footer" class="fn-drawer-footer"><slot name="footer" /></footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { X } from "@lucide/vue";
import { computed, onBeforeUnmount, watch } from "vue";

const props = withDefaults(defineProps<{ open: boolean; title?: string; width?: number | string; placement?: "left" | "right" }>(), {
  title: "",
  width: 460,
  placement: "right",
});
const emit = defineEmits<{ "update:open": [value: boolean]; close: [] }>();
const drawerStyle = computed(() => ({ width: typeof props.width === "number" ? `${props.width}px` : props.width }));

watch(
  () => props.open,
  open => {
    if (typeof document === "undefined") {
      return;
    }
    if (open) {
      document.addEventListener("keydown", onKeydown);
    } else {
      document.removeEventListener("keydown", onKeydown);
    }
  },
  { immediate: true }
);

function close(): void {
  emit("update:open", false);
  emit("close");
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    close();
  }
}

onBeforeUnmount(() => {
  if (typeof document !== "undefined") {
    document.removeEventListener("keydown", onKeydown);
  }
});
</script>

<style lang="less">
.fn-drawer-mask {
  position: fixed;
  z-index: 1100;
  inset: 0;
  display: flex;
  background: rgba(0, 0, 0, 0.42);
}

.fn-drawer {
  display: flex;
  width: min(460px, 100vw);
  height: 100%;
  max-width: 100vw;
  flex-direction: column;
  font-size: 14px;
  color: var(--fn-color-text);
  background: var(--fn-color-bg-container);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.2);
  &--right {
    margin-left: auto;
    border-left: 1px solid var(--fn-color-border-secondary);
  }
  &--left {
    margin-right: auto;
    border-right: 1px solid var(--fn-color-border-secondary);
  }
  .fn-drawer-header {
    display: flex;
    min-height: 62px;
    flex: none;
    align-items: center;
    justify-content: space-between;
    padding: 0 22px;
    border-bottom: 1px solid var(--fn-color-border-secondary);
    h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
  }
  .fn-drawer-close {
    display: inline-flex;
    width: 36px;
    height: 36px;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 6px;
    color: var(--fn-color-text-secondary);
    background: transparent;
    cursor: pointer;
    &:hover {
      color: var(--fn-color-text);
      background: var(--fn-color-fill-secondary);
    }
    &:focus-visible {
      outline: 2px solid var(--fn-color-primary);
      outline-offset: 1px;
    }
  }
  .fn-drawer-body {
    min-height: 0;
    flex: 1;
    overflow: auto;
  }
  .fn-drawer-footer {
    flex: none;
    padding: 14px 22px;
    border-top: 1px solid var(--fn-color-border-secondary);
  }
}

.fn-drawer-enter-active,
.fn-drawer-leave-active {
  transition: background-color 180ms ease;
  .fn-drawer {
    transition: transform 180ms ease;
  }
}
.fn-drawer-enter-from,
.fn-drawer-leave-to {
  background: transparent;
  .fn-drawer--right {
    transform: translateX(100%);
  }
  .fn-drawer--left {
    transform: translateX(-100%);
  }
}

@media (max-width: 560px) {
  .fn-drawer {
    width: 100vw !important;
  }
}
</style>
