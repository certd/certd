<template>
  <fs-page class="page-user-profile">
    <template #header>
      <div class="title">{{ t("certd.myInfo") }}</div>
    </template>
    <div class="p-10">
      <a-descriptions title="" bordered :column="2">
        <a-descriptions-item :label="t('authentication.username')">{{ userInfo.username }}</a-descriptions-item>
        <a-descriptions-item :label="t('authentication.nickName')">{{ userInfo.nickName }}</a-descriptions-item>
        <a-descriptions-item :label="t('authentication.avatar')">
          <a-avatar v-if="userInfo.avatar" size="large" :src="userAvatar" style="background-color: #eee"> </a-avatar>
          <a-avatar v-else size="large" style="background-color: #00b4f5">
            {{ userInfo.username }}
          </a-avatar>
        </a-descriptions-item>
        <a-descriptions-item :label="t('authentication.email')">{{ userInfo.email }}</a-descriptions-item>
        <a-descriptions-item :label="t('authentication.phoneNumber')">{{ userInfo.phoneCode }}{{ userInfo.mobile }}</a-descriptions-item>
        <a-descriptions-item label="角色">
          <fs-values-format :model-value="userInfo.roleIds" :dict="roleDict" />
        </a-descriptions-item>
        <a-descriptions-item v-if="settingStore.sysPublic.oauthEnabled && settingStore.isPlus" label="第三方账号绑定">
          <template v-for="item in computedOauthBounds" :key="item.name">
            <div v-if="item.addonId" class="flex items-center gap-2 mb-2">
              <fs-icon :icon="item.icon" class="mr-2 text-blue-500 w-5 flex justify-center items-center" />
              <span class="mr-2 w-36">{{ item.title }}</span>
              <a-button v-if="item.bound" type="primary" danger @click="unbind(item.name)">解绑</a-button>
              <a-button v-else type="primary" @click="bind(item.name)">绑定</a-button>
            </div>
          </template>
        </a-descriptions-item>
        <a-descriptions-item label="Passkey">
          <div v-if="passkeys.length > 0" class="flex flex-col gap-2">
            <div v-for="passkey in passkeys" :key="passkey.id" class="flex items-center gap-4 p-2 border-b">
              <fs-icon icon="ion:finger-print" class="text-blue-500 fs-24" />
              <span class="w-40 truncate" :title="passkey.passkeyId">{{ passkey.deviceName }}</span>
              <span>
                <div class="text-sm text-gray-500">注册时间：{{ formatDate(passkey.registeredAt) }}</div>
                <div class="text-sm text-gray-500">最后使用：{{ formatDate(passkey.updateTime) }}</div>
              </span>

              <a-button type="primary" danger @click="unbindPasskey(passkey.id)">解绑</a-button>
            </div>
          </div>
          <div v-else class="text-gray-500">暂无Passkey</div>
          <a-button v-if="passkeySupported" type="primary" class="mt-2" @click="registerPasskey">注册Passkey</a-button>
          <div v-if="!passkeySupported" class="text-red-500 text-sm mt-2">
            {{ t("authentication.passkeyNotSupported") }}
          </div>
          <pre class="helper"
            >{{ t("authentication.passkeyRegisterHelper") }}
          </pre>
        </a-descriptions-item>
        <a-descriptions-item :label="t('common.handle')">
          <a-button type="primary" @click="doUpdate">{{ t("authentication.updateProfile") }}</a-button>
          <change-password-button class="ml-10" :show-button="true"> </change-password-button>
        </a-descriptions-item>
      </a-descriptions>
    </div>
  </fs-page>
</template>

<script lang="ts" setup>
import * as api from "./api";
import { computed, onMounted, Ref, ref } from "vue";
import ChangePasswordButton from "/@/views/certd/mine/change-password-button.vue";
import { useI18n } from "/src/locales";
import { useUserProfile } from "./use";
import { usePasskeyRegister } from "./use";
import { message, Modal, notification } from "ant-design-vue";
import { useSettingStore } from "/@/store/settings";
import { isEmpty } from "lodash-es";
import { dict } from "@fast-crud/fast-crud";
import dayjs from "dayjs";

const { t } = useI18n();

defineOptions({
  name: "UserProfile",
});

const settingStore = useSettingStore();

const userInfo: Ref = ref({});
const passkeys = ref([]);
const passkeySupported = ref(false);

const getUserInfo = async () => {
  userInfo.value = await api.getMineInfo();
};
const roleDict = dict({
  url: "/basic/user/getSimpleRoles",
  value: "id",
  label: "name",
});

const { openEditProfileDialog } = useUserProfile();
const { openRegisterDialog } = usePasskeyRegister();

function doUpdate() {
  openEditProfileDialog({
    onUpdated: async () => {
      await getUserInfo();
    },
  });
}

const oauthBounds = ref([]);
const oauthProviders = ref([]);

async function loadOauthBounds() {
  const res = await api.GetOauthBounds();
  oauthBounds.value = res;
}

async function loadOauthProviders() {
  const res = await api.GetOauthProviders();
  oauthProviders.value = res;
}

const computedOauthBounds = computed(() => {
  const list = oauthProviders.value.map(item => {
    const bound = oauthBounds.value.find(bound => bound.type === item.name);
    return {
      ...item,
      bound,
    };
  });
  return list;
});

async function unbind(type: string) {
  Modal.confirm({
    title: "确认解绑吗？",
    okText: "确认",
    okType: "danger",
    onOk: async () => {
      await api.UnbindOauth(type);
      await loadOauthBounds();
    },
  });
}

async function bind(type: string) {
  const res = await api.OauthBoundUrl(type);
  const loginUrl = res.loginUrl;
  window.location.href = loginUrl;
}

async function loadPasskeys() {
  try {
    const res = await api.GetPasskeys();
    passkeys.value = res;
  } catch (e: any) {
    console.error("加载Passkey失败:", e);
  }
}

async function unbindPasskey(id: number) {
  Modal.confirm({
    title: "确认解绑吗？",
    okText: "确认",
    okType: "danger",
    onOk: async () => {
      await api.UnbindPasskey(id);
      await loadPasskeys();
    },
  });
}

const toBase64Url = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

async function registerPasskey() {
  if (!passkeySupported.value) {
    Modal.error({ title: "错误", content: "浏览器不支持Passkey" });
    return;
  }
  await openRegisterDialog({
    onSubmit: async (ctx: any) => {
      const deviceName = ctx.form.deviceName;
      if (!deviceName) {
        return;
      }
      await doRegisterPasskey(deviceName);
      message.success("Passkey注册成功");
    },
  });
}

async function doRegisterPasskey(deviceName: string) {
  try {
    const res: any = await api.generatePasskeyRegistrationOptions();
    const options = res;

    // navigator.credentials.query({
    //   publicKey: options,
    // });

    // const excludeCredentials = passkeys.value.map(item => ({
    //   id: new TextEncoder().encode(item.passkeyId),
    //   type: "public-key",
    // }));

    const credential = await (navigator.credentials as any).create({
      publicKey: {
        challenge: Uint8Array.from(atob(options.challenge.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)),
        rp: options.rp,
        pubKeyCredParams: options.pubKeyCredParams,
        timeout: options.timeout || 60000,
        attestation: options.attestation,
        // excludeCredentials: excludeCredentials,
        user: {
          id: new TextEncoder().encode(options.userId + ""),
          name: userInfo.value.username,
          displayName: deviceName,
        },
      },
    });

    if (!credential) {
      throw new Error("Passkey注册失败");
    }

    const response = {
      id: credential.id,
      type: credential.type,
      rawId: toBase64Url(credential.rawId),
      response: {
        attestationObject: toBase64Url(credential.response.attestationObject),
        clientDataJSON: toBase64Url(credential.response.clientDataJSON),
      },
    };
    console.log("credential", credential, response);
    debugger;

    const verifyRes: any = await api.verifyPasskeyRegistration(response, options.challenge, deviceName);
    await loadPasskeys();
  } catch (e: any) {
    console.error("Passkey注册失败:", e);
    notification.error({ message: "错误", description: e.message || "Passkey注册失败" });
  }
}

const formatDate = (dateString: string) => {
  if (!dateString) return "";
  return dayjs(dateString).format("YYYY-MM-DD HH:mm:ss");
};

const checkPasskeySupport = () => {
  passkeySupported.value = false;
  if (typeof window !== "undefined" && "credentials" in navigator && "PublicKeyCredential" in window) {
    passkeySupported.value = true;
  }
};

const userAvatar = computed(() => {
  if (isEmpty(userInfo.value.avatar)) {
    return "";
  }
  if (userInfo.value.avatar.startsWith("http")) {
    return userInfo.value.avatar;
  }

  return "api/basic/file/download?&key=" + userInfo.value.avatar;
});

onMounted(async () => {
  await getUserInfo();
  await loadOauthBounds();
  await loadOauthProviders();
  await loadPasskeys();
  checkPasskeySupport();
});
</script>
