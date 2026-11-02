<template>
  <a-modal v-bind="$attrs" v-model:open="open" :class="['fn-modal', { 'fn-modal-maximized': maximized }]" :width="maximized ? '100%' : width" :footer="null" @after-close="$emit('afterClose')">
    <template #title>
      <div ref="headerRef" class="fn-modal-titlebar">
        <slot name="title">{{ title }}</slot>
        <div class="fn-modal-titlebar-actions">
          <button type="button" title="最大化" @click.stop="toggleMaximized">
            <FullscreenExitOutlined v-if="maximized" />
            <FullscreenOutlined v-else />
          </button>
          <button type="button" title="关闭" @click.stop="open = false">
            <CloseOutlined />
          </button>
        </div>
      </div>
    </template>
    <slot />
    <template #footer>
      <div class="fn-modal-footer">
        <slot name="footer">
          <a-button @click="open = false">取消</a-button>
          <a-button type="primary" :loading="confirmLoading" @click="$emit('confirm')">确定</a-button>
        </slot>
      </div>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { CloseOutlined, FullscreenExitOutlined, FullscreenOutlined } from "@ant-design/icons-vue";
import { nextTick, onBeforeUnmount, ref, watch } from "vue";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    open?: boolean;
    title?: string;
    width?: number | string;
    draggable?: boolean;
    confirmLoading?: boolean;
  }>(),
  {
    open: false,
    title: "",
    width: 520,
    draggable: true,
    confirmLoading: false,
  }
);
const emit = defineEmits<{
  "update:open": [value: boolean];
  confirm: [];
  afterClose: [];
}>();

const open = ref(props.open);
const maximized = ref(false);
const headerRef = ref<HTMLElement>();
let modalElement: HTMLElement | undefined;
let offsetX = 0;
let offsetY = 0;

watch(
  () => props.open,
  value => {
    open.value = value;
    if (value) {
      void nextTick(bindDrag);
    }
  }
);
watch(open, value => emit("update:open", value));

function toggleMaximized() {
  maximized.value = !maximized.value;
  if (maximized.value) {
    resetPosition();
  }
}

function bindDrag() {
  if (!props.draggable || !headerRef.value) {
    return;
  }
  modalElement = headerRef.value.closest(".ant-modal") as HTMLElement | undefined;
  headerRef.value.addEventListener("mousedown", onMouseDown);
}

function onMouseDown(event: MouseEvent) {
  if (maximized.value || (event.target as HTMLElement).closest("button")) {
    return;
  }
  let lastX = event.clientX;
  let lastY = event.clientY;
  const onMouseMove = (moveEvent: MouseEvent) => {
    offsetX += moveEvent.clientX - lastX;
    offsetY += moveEvent.clientY - lastY;
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
</script>

<style lang="less">
.fn-modal {
  .fn-modal-titlebar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: move;
    user-select: none;
  }

  .fn-modal-titlebar-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-right: 24px;

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
}

.fn-modal-maximized {
  max-width: 100vw;
  top: 0;
  padding-bottom: 0;

  .ant-modal-content {
    height: 100vh;
    border-radius: 0;
  }
}
</style>
