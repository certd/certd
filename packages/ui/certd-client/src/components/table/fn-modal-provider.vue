<template>
  <div class="fn-modal-provider">
    <slot />
    <FnModal
      v-for="dialog in dialogs"
      :key="dialog.id"
      :open="dialog.open"
      :title="dialog.Props.title"
      :width="dialog.Props.width"
      :draggable="dialog.Props.draggable"
      :confirm-loading="dialog.loading"
      :buttons="getButtons(dialog)"
      :footer="dialog.Props.footer"
      @update:open="dialog.open = $event"
      @confirm="confirm(dialog)"
      @after-close="finish(dialog)"
    >
      <component :is="dialog.Props.body" v-if="dialog.Props.body" />
      <template v-for="(slot, name) in dialog.Props.slots" :key="name" #[name]><component :is="slot" /></template>
    </FnModal>
  </div>
</template>

<script setup lang="ts">
import { nextTick, reactive, shallowReactive } from "vue";
import { notification } from "ant-design-vue";
import FnModal from "./fn-modal.vue";
import { provideFnModal } from "./dialog";
import type { FnDialogContext, FnDialogProps, FnModalService, FnDialogRecord } from "./types";

const dialogs = shallowReactive<FnDialogRecord[]>([]);
let nextDialogId = 0;

function addDialog(resolve: FnDialogRecord["resolve"]) {
  const dialog = reactive({
    id: ++nextDialogId,
    open: false,
    loading: false,
    Props: { title: "" },
    resolve,
    result: undefined,
  }) as FnDialogRecord;
  dialogs.push(dialog);
  return dialog;
}

function open(dialog: FnDialogRecord, options: FnDialogProps) {
  dialog.Props = options;
  dialog.open = true;
  options.onOpen?.(getDialogContext(dialog));
  void nextTick(() => options.onOpened?.(getDialogContext(dialog)));
}
function getDialogContext(dialog: FnDialogRecord): FnDialogContext {
  return {
    close: () => {
      dialog.open = false;
    },
    confirm: () => {
      void confirm(dialog);
    },
    loading: dialog.loading,
  };
}

function openDialog<Result>(options: FnDialogProps<Result>) {
  return new Promise<Result | undefined>(resolve => {
    const dialog = addDialog(resolve);
    // 先挂载关闭状态的实例，再传入配置打开，确保组件能观察到打开状态变化。
    void nextTick(() => open(dialog, options));
  });
}

function getButtons(dialog: FnDialogRecord) {
  const buttons = dialog.Props.buttons;
  return {
    reset: { ...buttons?.reset, click: undefined, onClick: () => handleButtonClick(dialog, "reset") },
    cancel: { ...buttons?.cancel, click: undefined, onClick: () => handleButtonClick(dialog, "cancel") },
    confirm: { ...buttons?.confirm, click: undefined, onClick: () => confirm(dialog) },
  };
}

async function handleButtonClick(dialog: FnDialogRecord, key: string) {
  if (key === "confirm") {
    await confirm(dialog);
    return;
  }
  if (key === "reset") {
    const button = dialog.Props.buttons?.reset;
    const callback = button?.click || button?.onClick;
    if (callback) {
      await callback({ type: "row", dialogCtx: getDialogContext(dialog) });
    }
    return;
  }
  if (key === "cancel") {
    const button = dialog.Props.buttons?.cancel;
    const callback = button?.click || button?.onClick;
    if (callback) {
      await callback({ type: "row", dialogCtx: getDialogContext(dialog) });
    }
    dialog.open = false;
  }
}

const dialogService: FnModalService = { openDialog };
provideFnModal(dialogService);

async function confirm(dialog: FnDialogRecord) {
  if (dialog.loading) {
    return;
  }
  dialog.loading = true;
  try {
    const confirmButton = dialog.Props.buttons?.confirm;
    const callback = confirmButton?.click || confirmButton?.onClick;
    if (callback) {
      dialog.result = await callback({ type: "row", dialogCtx: getDialogContext(dialog) });
    }
    dialog.open = false;
  } catch (error) {
    const validationError = typeof error === "object" && error !== null && "errorFields" in error;
    if (!validationError) {
      const description = error instanceof Error ? error.message : String(error);
      notification.error({ message: "提交失败", description });
    }
  } finally {
    dialog.loading = false;
  }
}

function finish(dialog: FnDialogRecord) {
  const dialogIndex = dialogs.findIndex(item => item.id === dialog.id);
  if (dialogIndex < 0) {
    return;
  }
  dialogs.splice(dialogIndex, 1);
  dialog.Props.onClose?.(getDialogContext(dialog));
  dialog.resolve(dialog.result);
}
</script>
<style lang="less">
.fn-modal-provider {
  display: contents;
}
</style>
