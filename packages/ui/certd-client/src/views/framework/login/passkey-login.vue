<template>
  <div v-if="passkeyEnabled && isPlus" class="oauth-icon-button" :class="{ pointer: passkeySupported }" @click="handlePasskeyLogin">
    <div><fs-icon icon="ion:finger-print-outline" :class="{ 'text-blue-600': passkeySupported, 'text-gray-400': !passkeySupported }" class="text-40" /></div>
    <div class="ellipsis title" :title="t('authentication.passkeyLogin')" :class="{ 'text-gray-400': !passkeySupported }">{{ t("authentication.passkeyLogin") }}</div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from "vue";
import { useI18n } from "/@/locales";
import { useSettingStore } from "/@/store/settings";
import { notification } from "ant-design-vue";
import { request } from "/src/api/service";
import * as UserApi from "/src/store/user/api.user";
import { useUserStore } from "/src/store/user";

const { t } = useI18n();
const settingStore = useSettingStore();
const userStore = useUserStore();

const loading = ref(false);
const passkeySupported = ref(false);

const passkeyEnabled = computed(() => settingStore.sysPublic.passkeyEnabled);
const isPlus = computed(() => settingStore.isPlus);

const checkPasskeySupport = () => {
  passkeySupported.value = false;
  if (typeof window !== "undefined" && "credentials" in navigator && "PublicKeyCredential" in window) {
    passkeySupported.value = true;
  }
};

const handlePasskeyLogin = async () => {
  if (!passkeySupported.value) {
    notification.error({ message: t("authentication.passkeyNotSupported") });
    return;
  }

  loading.value = true;
  try {
    const optionsResponse: any = await request({
      url: "/passkey/generateAuthentication",
      method: "post",
    });
    const options = optionsResponse;

    console.log("passkey authentication options:", options, JSON.stringify(options));
    const credential = await (navigator.credentials as any).get({
      publicKey: {
        challenge: Uint8Array.from(atob(options.challenge.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)),
        rpId: options.rpId,
        allowCredentials: options.allowCredentials || [],
        timeout: options.timeout || 60000,
        authenticatorSelection: {
          residentKey: "required",
          requireResidentKey: true,
          userVerification: "preferred",
        },
      },
    });

    console.log("passkey authentication credential:", credential, JSON.stringify(credential));
    if (!credential) {
      throw new Error("Passkey认证失败");
    }

    const loginRes: any = await UserApi.loginByPasskey({
      credential,
      challenge: options.challenge,
    });

    await userStore.onLoginSuccess(loginRes);
  } catch (e: any) {
    console.error("Passkey登录失败:", e);
    notification.error({ message: e.message || "Passkey登录失败" });
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  checkPasskeySupport();
});
</script>
