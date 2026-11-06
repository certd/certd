<template>
  <div class="fn-form-dialog">
    <FnModal
      v-if="activeForm"
      v-bind="activeForm.dialog"
      :footer="dialogFooter"
      :open="formOpen"
      :buttons="dialogButtons"
      :confirm-loading="formLoading"
      @update:open="formOpen = $event"
      @confirm="submitForm"
      @reset="resetForm"
      @after-close="finishForm"
    >
      <FnForm ref="formRef" v-bind="activeForm" :on-submit="undefined" :on-reset="undefined" />
      <template v-for="(slot, name) in activeForm.dialog?.slots" :key="name" #[name]><component :is="slot" /></template>
    </FnModal>
  </div>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { notification } from "ant-design-vue";
import FnModal from "./fn-modal.vue";
import FnForm from "./fn-form.vue";
import type { FnFormProps, FnFormInstance, FnFormContext } from "./types";
const activeForm = ref<FnFormProps>();
const formRef = ref<FnFormInstance>();
const formOpen = ref(false);
const formLoading = ref(false);
let resolveForm: ((form: Record<string, any> | undefined) => void) | undefined;
let formResult: Record<string, any> | undefined;
const dialogButtons = computed(() => ({
  reset: { ...activeForm.value?.dialog?.buttons?.reset, click: undefined, onClick: resetForm },
  cancel: { ...activeForm.value?.dialog?.buttons?.cancel, click: undefined, onClick: closeForm },
  confirm: { ...activeForm.value?.dialog?.buttons?.confirm, loading: formLoading.value, click: undefined, onClick: submitForm },
}));
const dialogFooter = computed(() => {
  const footer = activeForm.value?.dialog?.footer;
  if (typeof footer === "function") {
    return () => footer(getFormContext().dialogCtx!);
  }
  return footer;
});
function getFormContext(): FnFormContext {
  return {
    type: "form",
    form: formRef.value?.getForm(),
    formRef: formRef.value,
    mode: activeForm.value?.mode,
    columns: activeForm.value?.columns,
    dialogCtx: {
      close: () => {
        formOpen.value = false;
      },
      confirm: () => {
        void submitForm();
      },
      loading: formLoading.value,
    },
  };
}
function open(options: FnFormProps) {
  if (resolveForm) {
    resolveForm(undefined);
  }
  const dialog = { title: options.title || "", width: options.width, draggable: options.draggable, ...options.dialog };
  activeForm.value = { ...options, dialog };
  formResult = undefined;
  formOpen.value = true;
  return new Promise<Record<string, any> | undefined>(resolve => {
    resolveForm = resolve;
  });
}
async function resetForm() {
  formRef.value?.reset();
  const ctx = getFormContext();
  const button = activeForm.value?.dialog?.buttons?.reset;
  const callback = button?.click || button?.onClick;
  await callback?.(ctx);
  await activeForm.value?.onReset?.(ctx);
}
async function closeForm() {
  const button = activeForm.value?.dialog?.buttons?.cancel;
  const callback = button?.click || button?.onClick;
  await callback?.(getFormContext());
  formOpen.value = false;
}
async function submitForm() {
  if (formLoading.value) {
    return;
  }
  formLoading.value = true;
  try {
    await formRef.value?.save();
    const ctx = getFormContext();
    await activeForm.value?.onSubmit?.(ctx);
    const button = activeForm.value?.dialog?.buttons?.confirm;
    const callback = button?.click || button?.onClick;
    await callback?.(ctx);
    formResult = ctx.form;
    formOpen.value = false;
  } catch (error) {
    const validationError = typeof error === "object" && error !== null && "errorFields" in error;
    if (!validationError) {
      notification.error({ message: "提交失败", description: String(error) });
    }
  } finally {
    formLoading.value = false;
  }
}
onBeforeUnmount(() => {
  resolveForm?.(undefined);
});
function finishForm() {
  resolveForm?.(formResult);
  resolveForm = undefined;
  activeForm.value = undefined;
}
defineExpose({ open });
</script>
<style lang="less">
.fn-form-dialog {
  display: contents;
}
</style>
