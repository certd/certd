<template>
  <fs-page class="page-user-profile">
    <template #header>
      <div class="title">{{ t("certd.myInfo") }}</div>
    </template>
    <div class="profile-container md:p-8">
      <div class="profile-card md:rounded">
        <div class="card-header">
          <div class="header-bg-gradient"></div>
          <div class="header-content">
            <div class="avatar-wrapper">
              <a-avatar v-if="userInfo.avatar" :size="100" :src="userAvatar" class="user-avatar"> </a-avatar>
              <a-avatar v-else size="100" class="user-avatar default-avatar">
                {{ userInfo.username }}
              </a-avatar>
              <!-- <div class="status-indicator"></div> -->
            </div>
            <div class="user-info">
              <h2 class="user-name flex items-center">
                {{ userInfo.nickName }}
                <fs-values-format :model-value="userInfo.roleIds" :dict="roleDict" color="blue" />
              </h2>
              <div class="user-details">
                <a-tag color="blue" class="detail-tag">
                  <span class="tag-icon">👤</span>
                  {{ userInfo.username }}
                </a-tag>
                <a-tag v-if="userInfo.email" color="green" class="detail-tag">
                  <span class="tag-icon">📧</span>
                  {{ userInfo.email }}
                </a-tag>
                <a-tag v-if="userInfo.mobile" color="purple" class="detail-tag">
                  <span class="tag-icon">📱</span>
                  {{ userInfo.mobile }}
                </a-tag>
              </div>
            </div>
            <div class="action-buttons gap-2">
              <a-button type="primary" class="action-btn" @click="doUpdate">
                {{ t("authentication.updateProfile") }}
              </a-button>
              <change-password-button :show-button="true" />

              <a-button type="primary" class="action-btn" @click="goSecuritySetting">
                {{ t("authentication.securitySettingTip") }}
              </a-button>
            </div>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap">
        <div v-if="settingStore.sysPublic.oauthEnabled && settingStore.isPlus" class="w-full md:w-1/2">
          <div class="bindings-card md:rounded">
            <div class="card-title">
              <fs-icon icon="ion:link-outline" class="title-icon" />
              <span>第三方账号绑定</span>
            </div>
            <div class="bindings-list">
              <template v-for="item in computedOauthBounds" :key="item.name">
                <div v-if="item.addonId" class="binding-item">
                  <div class="binding-icon">
                    <fs-icon :icon="item.icon" class="icon" />
                  </div>
                  <div class="binding-info">
                    <span class="binding-name">{{ item.title }}</span>
                    <span>
                      <a-tag v-if="item.bound" color="green" class="bound-tag1">已绑定</a-tag>
                      <a-tag v-else color="red" class="bound-tag1">未绑定</a-tag>
                    </span>
                  </div>
                  <a-button v-if="item.bound" type="primary" danger class="action-btn" @click="unbind(item.name)">
                    <template #icon><fs-icon icon="ion:unlink-outline" /></template>
                    解绑
                  </a-button>
                  <a-button v-else type="primary" class="action-btn" @click="bind(item.name)">
                    <template #icon><fs-icon icon="ion:link-outline" /></template>
                    绑定
                  </a-button>
                </div>
              </template>
              <div v-if="computedOauthBounds.length === 0" class="empty-text">暂无可用的第三方账号绑定</div>
            </div>
          </div>
        </div>

        <div v-if="settingStore.sysPublic.passkeyEnabled && settingStore.isPlus" class="w-full md:w-1/2">
          <div class="passkey-card md:rounded">
            <div class="card-title">
              <fs-icon icon="ion:finger-print" class="title-icon" />
              <span>Passkey 安全密钥</span>
            </div>
            <div class="passkey-list">
              <div v-for="passkey in passkeys" :key="passkey.id" class="passkey-item">
                <div class="passkey-icon hidden md:flex">
                  <fs-icon icon="ion:finger-print" class="icon" />
                </div>
                <div class="passkey-info">
                  <div class="passkey-name">{{ passkey.deviceName }}</div>
                  <div class="passkey-meta flex items-center">
                    <span class="meta-item flex items-center">
                      <fs-icon icon="ion:calendar-outline" class="meta-icon" />
                      {{ formatDate(passkey.registeredAt) }}
                    </span>
                    <span class="meta-item flex items-center">
                      <fs-icon icon="ion:time-outline" class="meta-icon" />
                      最近使用：<fs-time-humanize :model-value="passkey.updateTime" />
                    </span>
                  </div>
                </div>
                <a-button type="primary" danger class="remove-btn" @click="unbindPasskey(passkey.id)">
                  <template #icon><fs-icon icon="ion:trash-outline" /></template>
                  移除
                </a-button>
              </div>
            </div>
            <div v-if="passkeys.length === 0" class="empty-state">
              <fs-icon icon="ion:finger-print" class="empty-icon" />
              <p class="empty-text">暂无Passkey</p>
            </div>
            <div v-if="!passkeySupported" class="warning-box">
              <fs-icon icon="ion:warning-outline" class="warning-icon" />
              <span>{{ t("authentication.passkeyNotSupported") }}</span>
            </div>
            <a-button v-if="passkeySupported" type="primary" class="add-btn" @click="registerPasskey">
              <template #icon><fs-icon icon="ion:add-circle-outline" /></template>
              注册新的Passkey
            </a-button>
            <pre class="helper pre">{{ t("authentication.passkeyRegisterHelper") }}</pre>
          </div>
        </div>
      </div>
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
import { useRouter } from "vue-router";

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

const router = useRouter();
function goSecuritySetting() {
  router.push("/certd/mine/security");
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

    console.log("passkey register options:", options, JSON.stringify(options));
    const publicKey = {
      challenge: Uint8Array.from(atob(options.challenge.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)),
      rp: options.rp,
      pubKeyCredParams: options.pubKeyCredParams,
      timeout: options.timeout || 60000,
      // attestation: options.attestation,
      // excludeCredentials: excludeCredentials,
      // extensions: options.extensions,
      // authenticatorSelection: options.authenticatorSelection,
      // hints: options.hints,
      user: {
        id: new TextEncoder().encode(options.userId + ""),
        name: userInfo.value.username + "@" + deviceName,
        displayName: deviceName,
      },
      // 关键配置在这里 👇
      authenticatorSelection: {
        residentKey: "required", // 或 "preferred"，请求创建可发现凭证
        requireResidentKey: true, // 为兼容旧浏览器，设置与 residentKey 相同的值
        userVerification: "preferred", // 用户验证策略
      },
    };
    console.log("passkey register publicKey:", publicKey, JSON.stringify(publicKey));
    const credential = await (navigator.credentials as any).create({
      publicKey,
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

    const verifyRes: any = await api.verifyPasskeyRegistration(response, options.challenge, deviceName);
    console.log("verifyRes:", verifyRes, JSON.stringify(verifyRes));
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

<style lang="less">
.page-user-profile {
  :deep(.ant-descriptions-item-label) {
    font-weight: 500;
    color: rgba(0, 0, 0, 0.85);
  }
}

.dark {
  .page-user-profile {
    :deep(.ant-descriptions-item-label) {
      color: rgba(255, 255, 255, 0.85);
    }
  }

  .profile-container {
    .profile-card,
    .bindings-card,
    .passkey-card {
      background: linear-gradient(135deg, #1f1f1f 0%, #2d2d2d 100%);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);

      &:hover {
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
        border-color: rgba(255, 255, 255, 0.2);
      }
    }

    .card-header {
      .header-bg-gradient {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        opacity: 0.15;
      }
    }

    .header-content {
      .user-avatar {
        border-color: #3b3b3b;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      }

      .user-name {
        color: #e5e5e5;
      }

      .detail-tag {
        background: #3b3b3b;
        color: #e5e5e5;

        .tag-icon {
          color: #e5e5e5;
        }
      }
    }

    .bindings-list {
      .binding-item {
        background: #2d2d2d;
        border-color: rgba(255, 255, 255, 0.1);
        color: #e5e5e5;

        &:hover {
          border-color: #667eea;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
        }

        .binding-name {
          color: #e5e5e5;
        }

        .binding-status {
          &.bound {
            background: #1a3a2f;
            color: #4caf50;
          }

          &.unbound {
            background: #3a352a;
            color: #ffb300;
          }
        }
      }
    }

    .passkey-list {
      .passkey-item {
        background: #2d2d2d;
        border-color: rgba(255, 255, 255, 0.1);
        color: #e5e5e5;

        &:hover {
          border-color: #667eea;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
        }

        .passkey-name {
          color: #e5e5e5;
        }

        .passkey-meta {
          .meta-item {
            color: #b0b0b0;
          }

          .meta-icon {
            color: #888888;
          }
        }
      }
    }

    .empty-state {
      color: #b0b0b0;

      .empty-icon {
        opacity: 0.6;
      }
    }

    .warning-box {
      background: #3a2a2a;
      border-color: #5a3a3a;
      color: #e5e5e5;

      .warning-icon {
        color: #ef5350;
      }
    }

    .helper {
      background: #2d2d2d;
      border-color: rgba(255, 255, 255, 0.1);
      color: #b0b0b0;
    }
  }
}

.profile-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  // max-width: 1000px;

  .profile-card,
  .bindings-card,
  .passkey-card {
    background: #fff;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    overflow: hidden;
    transition: all 0.3s ease;
    margin: 5px;
  }

  .bindings-card,
  .passkey-card {
    padding: 18px;
  }

  .profile-card:hover,
  .bindings-card:hover,
  .passkey-card:hover {
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    transform: translateY(-2px);
  }

  .card-header {
    position: relative;
    padding: 40px 30px;
  }

  .header-bg-gradient {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 100%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    opacity: 0.08;
  }

  .header-content {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 30px;
  }

  .avatar-wrapper {
    position: relative;
    flex-shrink: 0;
  }

  .user-avatar {
    border: 4px solid #ffffff;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  }

  .status-indicator {
    position: absolute;
    bottom: 8px;
    right: 8px;
    width: 16px;
    height: 16px;
    background: #52c41a;
    border: 3px solid #ffffff;
    border-radius: 50%;
  }

  .user-info {
    flex: 1;
    min-width: 0;
  }

  .user-name {
    margin: 0 0 12px 0;
    font-size: 24px;
    font-weight: 600;
    color: #2c3e50;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .user-details {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .detail-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 13px;
  }

  .tag-icon {
    font-size: 14px;
  }

  .action-buttons {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
    font-weight: 500;
    border-radius: 8px;
    transition: all 0.3s ease;
  }

  .action-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .card-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 2px solid #f0f0f0;
  }

  .title-icon {
    font-size: 20px;
    color: #667eea;
  }

  .bindings-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .binding-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    background: #ffffff;
    border-radius: 12px;
    border: 1px solid #f0f0f0;
    transition: all 0.3s ease;
  }

  .binding-item:hover {
    border-color: #667eea;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
  }

  .binding-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #ebefff 0%, #e5d4ff 100%);
    border-radius: 10px;
  }

  .binding-icon .icon {
    font-size: 20px;
    color: #ffffff;
  }

  .binding-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .binding-name {
    font-size: 16px;
    font-weight: 500;
    color: #2c3e50;
  }

  .binding-status {
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 500;
  }

  .binding-status.bound {
    background: #e6fffa;
    color: #38a169;
  }

  .binding-status.unbound {
    background: #fffaf0;
    color: #d69e2e;
  }

  .passkey-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
  }

  .passkey-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    background: #ffffff;
    border-radius: 12px;
    border: 1px solid #f0f0f0;
    transition: all 0.3s ease;
  }

  .passkey-item:hover {
    border-color: #667eea;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
  }

  .passkey-icon {
    width: 48px;
    height: 48px;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    border-radius: 12px;
  }

  .passkey-icon .icon {
    font-size: 24px;
    color: #ffffff;
  }

  .passkey-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .passkey-name {
    font-size: 16px;
    font-weight: 600;
    color: #2c3e50;
  }

  .passkey-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    font-size: 12px;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #6b7280;
  }

  .meta-icon {
    font-size: 14px;
    color: #9ca3af;
  }

  .remove-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 8px;
    transition: all 0.3s ease;
  }

  .remove-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px 10px;
    color: #9ca3af;
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
    opacity: 0.5;
  }

  .empty-text {
    margin: 0;
    font-size: 14px;
  }

  .warning-box {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: #fff7ed;
    border: 1px solid #fed7d7;
    border-radius: 8px;
    margin-bottom: 16px;
  }

  .warning-icon {
    font-size: 18px;
    color: #f56565;
  }

  .add-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
    border-radius: 8px;
    transition: all 0.3s ease;
  }

  .add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .helper {
    background: #f8f9fa;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 13px;
    color: #6b7280;
    border: 1px solid #e5e7eb;
    margin-top: 16px;
  }

  @media (max-width: 768px) {
    .header-content {
      flex-direction: column;
      text-align: center;
    }

    .user-details {
      justify-content: center;
    }

    .action-buttons {
      justify-content: center;
      width: 100%;
    }
  }
}
</style>
