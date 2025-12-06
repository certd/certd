<template>
  <div class="oauth-footer relative">
    <div class="oauth-title">
      <div class="oauth-title-text">{{ computedTitle }}</div>
    </div>
    <div class="flex justify-center items-center gap-4">
      <template v-for="item in oauthProviderList" :key="item.type">
        <div v-if="item.addonId" class="oauth-icon-button pointer" @click="goOauthLogin(item.name)">
          <div><fs-icon :icon="item.icon" class="text-blue-600 text-40" /></div>
          <div class="ellipsis title" :title="item.addonTitle || item.title">{{ item.addonTitle || item.title }}</div>
        </div>
      </template>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import * as api from "./api";
import { useI18n } from "vue-i18n";
import { useSettingStore } from "/@/store/settings";
import { useRoute } from "vue-router";

const oauthProviderList = ref([]);
const props = defineProps<{
  oauthOnly?: boolean;
}>();

const { t } = useI18n();
const computedTitle = computed(() => {
  return props.oauthOnly ? t("authentication.oauthOnlyLoginTitle") : t("authentication.oauthLoginTitle");
});

const settingStore = useSettingStore();

const route = useRoute();
const queryOauthOnly = route.query.oauthOnly as string;
onMounted(async () => {
  oauthProviderList.value = await api.GetOauthProviders();
  //如果开启了自动跳转登录
  if (settingStore.sysPublic.oauthAutoRedirect && queryOauthOnly !== "false") {
    const firstOauth = oauthProviderList.value.find(item => item.addonId > 0);
    if (firstOauth) {
      goOauthLogin(firstOauth.name);
    }
  }
});

async function goOauthLogin(type: string) {
  //获取第三方登录URL
  const from = "web";
  const res = await api.OauthLogin(type, from);
  const loginUrl = res.loginUrl;
  window.location.href = loginUrl;
}
</script>
<style lang="less">
.oauth-footer {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 16px;

  .oauth-title {
    width: 100%;
    font-size: 14px;
    font-weight: 500;
    color: #8c8c8c;
    position: relative;
    .oauth-title-text {
      position: relative;
      z-index: 1;
      text-align: center;
      &::after {
        content: "";
        position: absolute;
        top: 50%;
        left: 0;
        width: 36%;
        height: 0.5px;
        background-color: #8c8c8c;
      }
      &::before {
        content: "";
        position: absolute;
        top: 50%;
        right: 0;
        width: 36%;
        height: 0.5px;
        background-color: #8c8c8c;
      }
    }
  }

  .oauth-icon-button {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 8px;
    padding: 8px 8px;
    border-radius: 100px;
    width: 100px;

    .title {
      width: 100%;
      text-align: center;
    }
    .fs-icon {
      font-size: 36px;
      color: #006be6;
      margin: 0px !important;
    }
  }
}
</style>
