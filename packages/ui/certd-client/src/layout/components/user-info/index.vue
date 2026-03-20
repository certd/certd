<template>
  <a-dropdown>
    <div class="fs-user-info" @click="goUserProfile">{{ t("user.greeting") }}，{{ userStore.getUserInfo?.nickName || userStore.getUserInfo?.username }}</div>
    <template #overlay>
      <a-menu>
        <a-menu-item>
          <div @click="goUserProfile">{{ t("user.profile") }}</div>
        </a-menu-item>
        <a-menu-item>
          <div @click="doLogout">{{ t("user.logout") }}</div>
        </a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</template>
<script lang="ts" setup>
import { useUserStore } from "/src/store/user";
import { Modal } from "ant-design-vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

defineOptions({
  name: "FsUserInfo",
});
const userStore = useUserStore();
const { t } = useI18n();

const router = useRouter();

function goUserProfile() {
  console.log("goUserProfile");
  router.push("/certd/mine/user-profile");
}
function doLogout() {
  Modal.confirm({
    iconType: "warning",
    title: t("app.login.logoutTip"),
    content: t("app.login.logoutMessage"),
    onOk: async () => {
      await userStore.logout(true);
    },
  });
}
</script>
