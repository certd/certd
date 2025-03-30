<script lang="ts" setup>
import { BasicLayout, LockScreen, UserDropdown } from "/@/vben/layouts";
import FsSourceLink from "./components/source-link/index.vue";
import { computed } from "vue";
import { VBEN_DOC_URL } from "/@/vben/constants";
import { BookOpenText } from "/@/vben/icons";
import { preferences } from "/@/vben/preferences";
import { useAccessStore } from "/@/vben/stores";
import { openWindow } from "/@/vben/utils";

import { $t } from "/@/vben/locales";
import { useUserStore } from "/@/store/modules/user";

const userStore = useUserStore();
const accessStore = useAccessStore();

const menus = computed(() => [
  // {
  //   handler: () => {
  //     openWindow(VBEN_DOC_URL, {
  //       target: "_blank"
  //     });
  //   },
  //   icon: BookOpenText,
  //   text: $t("ui.widgets.document")
  // }
]);

const avatar = computed(() => {
  return userStore.userInfo?.avatar ?? preferences.app.defaultAvatar;
});

async function handleLogout() {
  await userStore.logout(true);
}
</script>

<template>
  <BasicLayout @clear-preferences-and-logout="handleLogout">
    <template #user-dropdown>
      <UserDropdown :avatar :menus :text="userStore.userInfo?.nickName" description="development@handsfree.work" tag-text="Pro" @logout="handleLogout" />
    </template>
    <template #lock-screen>
      <LockScreen :avatar @to-login="handleLogout" />
    </template>
    <template #extra>
      <FsSourceLink />
    </template>
  </BasicLayout>
</template>
