<template>
  <a-dropdown>
    <div class="fs-user-info">您好，{{ userStore.getUserInfo?.nickName }}</div>
    <template #overlay>
      <a-menu>
        <a-menu-item>
          <div @click="goUserProfile">账号信息</div>
        </a-menu-item>
        <a-menu-item>
          <div @click="doLogout">注销登录</div>
        </a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</template>
<script lang="ts" setup>
import { useUserStore } from "/src/store/modules/user";
import { Modal } from "ant-design-vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

defineOptions({
  name: "FsUserInfo"
});
const userStore = useUserStore();
console.log("user", userStore);
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
    }
  });
}
</script>
