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
import { Modal } from "ant-design-vue";
import { useSettingStore } from "/@/store/settings";
import { isEmpty } from "lodash-es";

const { t } = useI18n();

defineOptions({
  name: "UserProfile",
});

const settingStore = useSettingStore();

const userInfo: Ref = ref({});

const getUserInfo = async () => {
  userInfo.value = await api.getMineInfo();
};
const { openEditProfileDialog } = useUserProfile();

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
  //获取第三方登录URL
  const res = await api.OauthBoundUrl(type);
  const loginUrl = res.loginUrl;
  window.location.href = loginUrl;
}

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
});
</script>
