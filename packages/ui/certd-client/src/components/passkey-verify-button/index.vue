<template>
  <div class="passkey-verify-button">
    <div v-if="divider" class="passkey-verify-button__divider">
      <span class="passkey-verify-button__line"></span>
      <span class="passkey-verify-button__or">{{ dividerText || t("certd.auth.passkeyVerifyOr") }}</span>
      <span class="passkey-verify-button__line"></span>
    </div>
    <a-button class="passkey-verify-button__btn" :loading="loading" :disabled="disabled || !supported" block @click="onClick">
      <Fingerprint :size="18" class="passkey-verify-button__icon" />
      <span>{{ label || t("certd.auth.passkeyVerify") }}</span>
    </a-button>
    <div v-if="!supported" class="passkey-verify-button__tip">{{ t("certd.auth.passkeyNotSupported") }}</div>
  </div>
</template>

<script setup lang="ts">
import { Fingerprint } from "@lucide/vue";
import { useI18n } from "/src/locales";

defineOptions({
  name: "PasskeyVerifyButton",
});

const props = withDefaults(
  defineProps<{
    loading?: boolean;
    disabled?: boolean;
    divider?: boolean;
    label?: string;
    dividerText?: string;
  }>(),
  {
    loading: false,
    disabled: false,
    divider: true,
    label: "",
    dividerText: "",
  }
);

const emit = defineEmits<{
  click: [];
}>();

const { t } = useI18n();
const supported = typeof window !== "undefined" && "PublicKeyCredential" in window && "credentials" in navigator;

function onClick() {
  if (props.disabled || props.loading || !supported) {
    return;
  }
  emit("click");
}
</script>

<style lang="less">
.passkey-verify-button {
  margin-top: 18px;

  &__divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
  }

  &__line {
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--border-color-2, #e5e7eb), transparent);
  }

  &__or {
    font-size: 12px;
    color: var(--text-color-3, #9ca3af);
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  &__btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 40px;
    border-radius: 8px;
    border: 1px solid var(--border-color-2, #d9d9d9);
    background: var(--component-background, #ffffff);
    color: var(--text-color, #1f2937);
    font-weight: 500;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
    transition: all 0.2s ease;

    &:not(:disabled):hover {
      color: var(--primary-color, #1677ff);
      border-color: var(--primary-color, #1677ff);
      background: var(--component-background, #ffffff);
      box-shadow: 0 2px 8px rgba(22, 119, 255, 0.12);
    }
  }

  &__icon {
    flex: none;
  }

  &__tip {
    margin-top: 8px;
    font-size: 12px;
    color: var(--text-color-3, #9ca3af);
    text-align: center;
  }

  .dark & {
    &__line {
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.16), transparent);
    }

    &__btn {
      border-color: rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.04);

      &:not(:disabled):hover {
        background: rgba(22, 119, 255, 0.14);
      }
    }
  }
}
</style>
