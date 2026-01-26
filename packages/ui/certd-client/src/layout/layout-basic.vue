<script lang="ts" setup>
import { BasicLayout, LockScreen, UserDropdown } from "/@/vben/layouts";

import { computed, onErrorCaptured, onMounted, provide, ref } from "vue";
import { useUserStore } from "/@/store/user";
import VipButton from "/@/components/vip-button/index.vue";
import TutorialButton from "/@/components/tutorial/index.vue";
import { useSettingStore } from "/@/store/settings";
import PageFooter from "./components/footer/index.vue";
import { useRouter } from "vue-router";
import MaxKBChat from "/@/components/ai/index.vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const userStore = useUserStore();

const router = useRouter();
const menus = computed(() => [
  {
    handler: () => {
      router.push("/certd/mine/user-profile");
    },
    icon: "fa-solid:book",
    text: t("certd.accountInfo"),
  },
  {
    handler: () => {
      router.push("/certd/mine/security");
    },
    icon: "fluent:shield-keyhole-16-regular",
    text: t("certd.securitySettings"),
  },
]);

const avatar = computed(() => {
  const avt = userStore.getUserInfo?.avatar;
  return avt ? `/api/basic/file/download?key=${avt}` : "";
});

async function handleLogout() {
  await userStore.logout(true);
}

const settingStore = useSettingStore();

const sysPublic = computed(() => {
  return settingStore.sysPublic;
});
const siteInfo = computed(() => {
  return settingStore.siteInfo;
});

onErrorCaptured(e => {
  console.error("ErrorCaptured:", e);
  // notification.error({ message: e.message });
  //阻止错误向上传递
  return false;
});

onMounted(async () => {
  await settingStore.checkUrlBound();
});

function goGithub() {
  window.open("https://github.com/certd/certd");
}
const settingsStore = useSettingStore();
const chatBox = ref();
const openChat = (q: string) => {
  chatBox.value.openChat({ q });
};
provide("fn:ai.open", openChat);
</script>

<template>
  <BasicLayout @clear-preferences-and-logout="handleLogout">
    <template #user-dropdown>
      <UserDropdown :avatar="avatar" :menus="menus" :text="userStore.userInfo?.nickName || userStore.userInfo?.username" description="" tag-text="" @logout="handleLogout" />
    </template>
    <template #lock-screen>
      <LockScreen :avatar @to-login="handleLogout" />
    </template>
    <template #header-right-0>
      <div class="hover:bg-accent ml-1 mr-2 cursor-pointer rounded-full hidden md:block">
        <tutorial-button class="flex-center header-btn" mode="nav" />
      </div>
      <div class="hover:bg-accent ml-1 mr-2 cursor-pointer rounded-full">
        <vip-button class="flex-center header-btn" mode="nav" />
      </div>
      <div v-if="!settingStore.isComm" class="hover:bg-accent ml-1 mr-2 cursor-pointer rounded-full">
        <fs-button shape="circle" type="text" icon="ion:logo-github" :text="null" @click="goGithub" />
      </div>
    </template>
    <template #footer>
      <PageFooter></PageFooter>
      <MaxKBChat v-if="settingsStore.sysPublic.aiChatEnabled !== false" ref="chatBox" />
    </template>
  </BasicLayout>
</template>

<style lang="less">
.header-btn {
  font-size: 14px;
  padding: 5px;
}
</style>
