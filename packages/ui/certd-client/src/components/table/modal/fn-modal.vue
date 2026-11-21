<template>
  <div v-if="props.open" class="fn-modal-mask" @mousedown.self="close">
    <div ref="modalElementRef" :class="['fn-modal', { 'fn-modal-maximized': fullscreenState }]" :style="{ width: fullscreenState ? '100%' : typeof width === 'number' ? `${width}px` : width }" v-bind="$attrs">
      <div ref="headerRef" class="fn-modal-titlebar">
        <slot name="headerLeft"><FnRender v-if="slots?.headerLeft" :render="slots.headerLeft" /></slot>
        <div class="fn-modal-title font-bold">
          <slot name="title">{{ title }}</slot>
        </div>
        <div class="fn-modal-titlebar-actions">
          <button type="button" title="最大化" @click.stop="toggleMaximized">
            <Minimize2 v-if="fullscreenState" :size="16" />
            <Maximize2 v-else :size="16" />
          </button>
          <button type="button" title="关闭" @click.stop="close">
            <X :size="16" />
          </button>
        </div>
        <slot name="headerRight"><FnRender v-if="slots?.headerRight" :render="slots.headerRight" /></slot>
      </div>
      <div class="fn-modal-body">
        <slot name="bodyTop"><FnRender v-if="slots?.bodyTop" :render="slots.bodyTop" /></slot><slot v-if="props.open" /><slot name="bodyBottom"><FnRender v-if="slots?.bodyBottom" :render="slots.bodyBottom" /></slot>
      </div>
      <div v-if="footer !== null && footer !== false" class="fn-modal-footer">
        <slot name="footerLeft"><FnRender v-if="slots?.footerLeft" :render="slots.footerLeft" /></slot>
        <slot name="actionLeft"><FnRender v-if="slots?.actionLeft" :render="slots.actionLeft" /></slot>
        <slot name="footer">
          <FnRender v-if="slots?.footer" :render="slots.footer" :ctx="{ close, confirm: () => $emit('confirm'), loading: confirmLoading }" />
          <template v-else>
            <template v-for="(button, key) in buttonProps" :key="key"><FnButton v-if="button.show !== false" v-bind="button" /></template>
          </template>
        </slot>
        <slot name="actionRight"><FnRender v-if="slots?.actionRight" :render="slots.actionRight" /></slot>
        <slot name="footerRight"><FnRender v-if="slots?.footerRight" :render="slots.footerRight" /></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Maximize2, Minimize2, X } from "@lucide/vue";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import FnButton from "../components/fn-button.vue";
import FnRender from "../components/fn-render";
import type { FnModalProps } from "../types/index";

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<FnModalProps>(), {
  open: false,
  title: "",
  width: 920,
  draggable: true,
  confirmLoading: false,
  // footer 类型含 Boolean，必须显式保留 undefined，避免未配置时被转为 false。
  footer: undefined,
});
const slots = computed(() => (props as FnModalProps & { slots?: Record<string, (props?: Record<string, any>) => any> }).slots);
const emit = defineEmits<{
  "update:open": [value: boolean];
  confirm: [];
  reset: [];
  afterClose: [];
}>();
const openState = computed(() => props.open);
const fullscreenState = ref(false);

const buttonProps = computed(() => ({
  reset: { text: "重置", type: "default", onClick: () => emit("reset"), ...props.buttons?.reset },
  cancel: {
    text: "取消",
    type: "default",
    onClick: close,
    ...props.buttons?.cancel,
  },
  confirm: { text: "确定", type: "primary", loading: props.confirmLoading, onClick: () => emit("confirm"), ...props.buttons?.confirm },
}));
const headerRef = ref<HTMLElement>();
const modalElementRef = ref<HTMLElement>();
let modalElement: HTMLElement | undefined;
let offsetX = 0;
let offsetY = 0;

watch(
  () => props.open,
  (value, previousValue) => {
    if (value) {
      void nextTick(bindDrag);
    } else if (previousValue) {
      emit("afterClose");
    }
  }
);
onMounted(() => {
  if (props.open) {
    void nextTick(bindDrag);
  }
});

function close() {
  emit("update:open", false);
}

function openModal() {
  emit("update:open", true);
}

function setFullscreen(value: boolean) {
  if (fullscreenState.value === value) {
    return;
  }
  fullscreenState.value = value;
  if (value) {
    resetPosition();
  }
}

function toggleMaximized() {
  setFullscreen(!fullscreenState.value);
}

function bindDrag() {
  if (!props.draggable || !headerRef.value) {
    return;
  }
  modalElement = modalElementRef.value;
  headerRef.value.addEventListener("mousedown", onMouseDown);
}

function onMouseDown(event: MouseEvent) {
  if (fullscreenState.value || (event.target as HTMLElement).closest("button")) {
    return;
  }
  let lastX = event.clientX;
  let lastY = event.clientY;
  const onMouseMove = (moveEvent: MouseEvent) => {
    const header = headerRef.value;
    if (!header) {
      return;
    }
    const bounds = header.getBoundingClientRect();
    const viewport = document.documentElement;
    const deltaX = moveEvent.clientX - lastX;
    const deltaY = moveEvent.clientY - lastY;
    // 左右允许标题栏移出 70%，上下保持标题栏完整可见。
    const horizontalOverflow = bounds.width * 0.7;
    const minDeltaX = -bounds.left - horizontalOverflow;
    const maxDeltaX = Math.max(minDeltaX, viewport.clientWidth - bounds.right + horizontalOverflow);
    const maxDeltaY = Math.max(-bounds.top, viewport.clientHeight - bounds.bottom);
    offsetX += Math.min(Math.max(deltaX, minDeltaX), maxDeltaX);
    offsetY += Math.min(Math.max(deltaY, -bounds.top), maxDeltaY);
    lastX = moveEvent.clientX;
    lastY = moveEvent.clientY;
    applyPosition();
  };
  const onMouseUp = () => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
}

function applyPosition() {
  if (modalElement) {
    modalElement.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
  }
}

function resetPosition() {
  offsetX = 0;
  offsetY = 0;
  if (modalElement) {
    modalElement.style.transform = "";
  }
}

onBeforeUnmount(() => {
  headerRef.value?.removeEventListener("mousedown", onMouseDown);
});

defineExpose({ state: { open: openState, fullscreen: fullscreenState }, openModal, close, setFullscreen, toggleFullscreen: toggleMaximized });
</script>

<style lang="less">
.fn-modal-mask {
  position: fixed;
  z-index: 1000;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.45);
}

.fn-modal {
  font-size: 14px;
  max-width: 100%;
  max-height: 100%;
  overflow: hidden;
  border-radius: 8px;
  background: #fff;
  padding: 14px 20px;
  margin: auto;
  margin-top: 120px;
  display: flex;
  flex-direction: column;
  box-shadow:
    0 6px 16px rgba(0, 0, 0, 0.08),
    0 3px 6px -4px rgba(0, 0, 0, 0.12);

  .fn-modal-body {
    max-height: calc(100vh - 180px);
    overflow: auto;
    padding: 24px;
    flex: 1;
    color: #344054;
  }
  .fn-modal-titlebar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: move;
    user-select: none;
  }
  .fn-modal-title {
    font-size: 16px;
  }

  .fn-modal-titlebar-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    // margin-right: 24px;

    button {
      display: inline-flex;
      width: 28px;
      height: 28px;
      align-items: center;
      justify-content: center;
      padding: 0;
      border: 0;
      color: rgba(0, 0, 0, 0.45);
      background: transparent;
      cursor: pointer;
    }

    button:hover {
      color: rgba(0, 0, 0, 0.88);
      background: rgba(0, 0, 0, 0.06);
    }
  }

  .fn-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  .dark & {
    color: #d8dee8;
    background: #1f2329;

    .fn-modal-body {
      color: #d8dee8;
    }

    .fn-modal-titlebar-actions button {
      color: rgba(255, 255, 255, 0.55);
    }

    .fn-modal-titlebar-actions button:hover {
      color: rgba(255, 255, 255, 0.9);
      background: rgba(255, 255, 255, 0.08);
    }

    .fn-modal-footer {
      border-color: #383e47;
    }
  }
}

.fn-modal-maximized {
  width: 100% !important;
  height: 100%;
  max-height: 100%;
  border-radius: 0;
  margin: 0px;

  .fn-modal-body {
    max-height: calc(100vh - 128px);
  }
}
</style>
