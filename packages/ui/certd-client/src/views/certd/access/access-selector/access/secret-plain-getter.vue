<template>
  <a-button class="cd-secret-plain-getter ml-5" @click="showPlain">
    <fs-icon class="pointer" :icon="computedIcon" />
  </a-button>
</template>
<script lang="tsx" setup>
import { computed, inject, ref } from "vue";
import { notification } from "ant-design-vue";
import { useFormDialog } from "/@/use/use-dialog";
import PasskeyVerifyButton from "/@/components/passkey-verify-button/index.vue";
import { isPasskeyCancelledError } from "/@/utils/util.passkey";
defineOptions({
  name: "SecretPlainGetter",
});

const props = defineProps<{
  modelValue?: string;
  accessId?: number;
  inputKey: string;
}>();

const emit = defineEmits(["update:modelValue"]);
const showRef = ref(false);
const computedIcon = computed(() => {
  return showRef.value ? "ion:eye-outline" : "ion:eye-off-outline";
});
const accessApi: any = inject("accessApi");
const { openFormDialog } = useFormDialog();
const passkeyLoading = ref(false);
let closeVerifyDialog: (() => void) | null = null;
const passkeySupported = typeof window !== "undefined" && "PublicKeyCredential" in window && "credentials" in navigator;

function base64UrlToUint8Array(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

async function loadPlainSecret() {
  if (!props.accessId) {
    return;
  }
  const plain = await accessApi.GetSecretPlain(props.accessId, props.inputKey);
  emit("update:modelValue", plain);
  showRef.value = true;
}

async function handlePasskeyVerify() {
  if (!passkeySupported) {
    notification.error({ message: "当前浏览器不支持 Passkey" });
    return;
  }
  passkeyLoading.value = true;
  try {
    const options = await accessApi.GeneratePasskeyAuthentication();
    const credential = await (navigator.credentials as any).get({
      publicKey: {
        challenge: base64UrlToUint8Array(options.challenge),
        rpId: options.rpId,
        allowCredentials: (options.allowCredentials || []).map((credential: any) => ({
          ...credential,
          id: base64UrlToUint8Array(credential.id),
        })),
        timeout: options.timeout || 60000,
        userVerification: "required",
      },
    });
    if (!credential) {
      throw new Error("Passkey 验证已取消");
    }
    await accessApi.VerifyPasskeySecretAccess(credential, options.challenge);
    await loadPlainSecret();
    notification.success({ message: "Passkey 验证成功" });
    // 直接关闭弹窗，避免被动态验证码的必填校验卡住
    closeVerifyDialog?.();
  } catch (e: any) {
    if (isPasskeyCancelledError(e)) {
      notification.info({ message: "已取消 Passkey 验证" });
    } else {
      notification.error({ message: e.message || "Passkey 验证失败" });
    }
  } finally {
    passkeyLoading.value = false;
  }
}

async function showPlain() {
  if (accessApi.HasSecretAccess()) {
    await loadPlainSecret();
    return;
  }

  const dialog = (await openFormDialog({
    title: "验证 2FA",
    wrapper: {
      width: 420,
      slots: {
        "form-body-bottom": () => {
          return <PasskeyVerifyButton loading={passkeyLoading.value} onClick={() => handlePasskeyVerify()} />;
        },
      },
    },
    initialForm: { verifyCode: "" },
    columns: {
      verifyCode: {
        title: "动态验证码",
        type: "text",
        form: {
          component: { placeholder: "请输入身份验证器中的 6 位验证码" },
          rules: [{ required: true, message: "请输入动态验证码" }],
          col: { span: 24 },
          helper: {
            render: () => {
              return (
                <div>
                  必须先开启
                  <a target="_blank" href="/#/cert/mine/security">
                    2FA验证
                  </a>
                  ，或使用下方 Passkey 验证
                </div>
              );
            },
          },
        },
      },
    },
    async onSubmit(form: any) {
      await accessApi.VerifySecretAccess(form.verifyCode);
      await loadPlainSecret();
    },
  })) as { close?: () => void } | undefined;
  closeVerifyDialog = () => dialog?.close?.();
}
</script>
<style lang="less"></style>
