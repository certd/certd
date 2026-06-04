<template>
  <div class="oauth-callback-page">
    <div class="oauth-callback-content">
      <div v-if="!bindRequired" class="oauth-callback-title">
        <span v-if="!error">登录中...</span>
        <span v-else>{{ error }}</span>
      </div>
      <div v-else class="oauth-callback-title mt-10">
        <div>第三方（{{ oauthType }}）登录成功，您还未绑定账号，请选择</div>

        <div class="mt-10">
          <a-button v-if="!userStore.isLogined" class="w-full mt-10" type="primary" @click="goBindUser">绑定已有账号</a-button>
          <a-button v-else class="w-full mt-10" type="primary" @click="doBindCurrent">绑定当前登录账号({{ userStore.getUserInfo.username }} - {{ userStore.getUserInfo.nickName }})</a-button>
          <a-button v-if="settingStore.sysPublic.registerEnabled" class="w-full mt-10" type="primary" @click="autoRegister">创建新账号绑定</a-button>
        </div>

        <div class="w-full mt-10">
          <router-link to="/login" class="w-full mt-10" type="primary">返回登录页</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import * as api from "./api";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "/@/store/user";
import { notification } from "ant-design-vue";
import { useSettingStore } from "/@/store/settings";
import { inviteUtils } from "/@/utils/util.invite";

const route = useRoute();
const router = useRouter();
const settingStore = useSettingStore();
const oauthType = route.params.type as string;
const validationCode = route.query.validationCode as string;
const forType = route.query.forType as string;
const error = ref(route.query.error as string);
const userStore = useUserStore();

const bindRequired = ref(false);
const bindCode = ref("");

async function handleOauthToken() {
  //处理第三方登录回调
  const res = await api.OauthToken(oauthType, validationCode);
  if (res.token) {
    //登录成功
    userStore.onLoginSuccess(res);
    //跳转到首页
    router.replace("/index");
    return;
  }
  if (res.bindRequired) {
    //需要绑定
    bindCode.value = res.validationCode;
    //如果开启了自动注册，默认自动注册账号
    if (settingStore.sysPublic.oauthAutoRegister) {
      autoRegister();
    } else {
      bindRequired.value = true;
    }
  }
}

async function doBindCurrent() {
  await api.BindUser(validationCode);
  notification.success({
    message: "绑定成功",
  });
  //跳转到首页
  router.replace("/certd/mine/user-profile");
}

onMounted(async () => {
  if (error.value) {
    return;
  }

  if (forType === "bind") {
    //从用户中心页面，进行第三方账号的绑定
    await doBindCurrent();
    return;
  }

  await handleOauthToken();
});

async function goBindUser() {
  //绑定已有账号
  router.replace({
    path: "/login",
    query: {
      bindCode: bindCode.value,
    },
  });
}

async function autoRegister() {
  //自动注册账号
  const res = await api.AutoRegister(oauthType, bindCode.value, inviteUtils.get());
  //登录成功
  userStore.onLoginSuccess(res);
  //跳转到首页
  router.replace("/index");
}
</script>
<style lang="less">
.oauth-callback-page {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  width: 100%;
  .oauth-callback-content {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    padding: 16px;
    border-radius: 16px;
    box-shadow: 0 0 16px rgba(0, 0, 0, 0.1);
    width: 500px;
    max-width: 90%;
    margin: 0 auto;
    margin-top: 50px;
    margin-bottom: 100px;
    min-height: 200px;

    .oauth-callback-title {
      font-size: 16px;
      font-weight: 500;
    }
  }
}
</style>
