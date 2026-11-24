<template>
  <a-modal :open="true" :title="title" :width="440" :z-index="2000" :footer="null" :mask-closable="false" @cancel="cancel">
    <a-alert type="warning" show-icon :message="warning" class="mb-4" />
    <a-form layout="vertical">
      <a-form-item :label="t('certd.localCa.dynamicCode')" required>
        <a-input v-model:value="code" :placeholder="t('certd.localCa.dynamicCodePlaceholder')" @press-enter="verifyCode" />
      </a-form-item>
      <a-button type="primary" block :loading="loading" @click="verifyCode">{{ t("certd.localCa.verifyAndContinue") }}</a-button>
      <a-button v-if="passkeySupported" type="link" block :loading="passkeyLoading" @click="verifyPasskey">{{ t("certd.localCa.passkeyVerify") }}</a-button>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { notification } from "ant-design-vue";
import { useI18n } from "/src/locales";
import { createAccessApi } from "/@/views/certd/access/api";

const props = defineProps<{
  title: string;
  warning: string;
  action: () => Promise<void>;
}>();

const emit = defineEmits<{
  done: [];
  cancel: [];
}>();

const { t } = useI18n();
const secretAccessApi = createAccessApi("user");
const code = ref("");
const loading = ref(false);
const passkeyLoading = ref(false);
const passkeySupported = typeof window !== "undefined" && "PublicKeyCredential" in window && "credentials" in navigator;

function cancel() {
  emit("cancel");
}

function base64UrlToUint8Array(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function runAction() {
  await props.action();
  emit("done");
}

async function verifyCode() {
  if (!code.value) {
    notification.warning({ message: t("certd.localCa.dynamicCodeRequired") });
    return;
  }
  loading.value = true;
  try {
    await secretAccessApi.VerifySecretAccess(code.value);
    await runAction();
  } catch (e: any) {
    notification.error({ message: e?.message || t("certd.localCa.passkeyFailed") });
  } finally {
    loading.value = false;
  }
}

async function verifyPasskey() {
  passkeyLoading.value = true;
  try {
    const options = await secretAccessApi.GeneratePasskeyAuthentication();
    const credential = await (navigator.credentials as any).get({
      publicKey: {
        challenge: base64UrlToUint8Array(options.challenge),
        rpId: options.rpId,
        allowCredentials: (options.allowCredentials || []).map((item: any) => ({
          ...item,
          id: base64UrlToUint8Array(item.id),
        })),
        timeout: options.timeout || 60000,
        userVerification: "required",
      },
    });
    if (!credential) {
      throw new Error(t("certd.localCa.passkeyCancelled"));
    }
    await secretAccessApi.VerifyPasskeySecretAccess(credential, options.challenge);
    await runAction();
  } catch (e: any) {
    notification.error({ message: e?.message || t("certd.localCa.passkeyFailed") });
  } finally {
    passkeyLoading.value = false;
  }
}
</script>
