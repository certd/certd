<template>
  <fs-page class="cd-page-account">
    <template #header>
      <div class="title">
        站点绑定
        <span class="sub">管理你安装过的Certd站点，可以通过转移功能避免丢失VIP，强烈建议绑定</span>
      </div>
    </template>

    <iframe ref="iframeRef" class="account-iframe" :src="iframeSrcRef"> </iframe>
  </fs-page>
</template>

<script setup lang="tsx">
import { IframeClient } from "@certd/lib-iframe";
import { computed, onMounted, ref } from "vue";
import { useUserStore } from "/@/store/modules/user";
import { useSettingStore } from "/@/store/modules/settings";
import * as api from "./api";
import { notification } from "ant-design-vue";
const iframeRef = ref();

const userStore = useUserStore();
const settingStore = useSettingStore();

const iframeSrcRef = computed(() => {
  if (!settingStore.installInfo.accountServerBaseUrl) {
    return "";
  }
  return `${settingStore.installInfo.accountServerBaseUrl}/#/?appKey=${settingStore.installInfo.appKey}`;
});

type SubjectInfo = {
  subjectId: string;
  installTime?: number;
  vipType?: string;
  expiresTime?: number;
};
onMounted(() => {
  const iframeClient = new IframeClient(iframeRef.value, (e: any) => {
    notification.error({
      message: " error",
      description: e.message
    });
  });
  iframeClient.register("getSubjectInfo", async (req) => {
    const subjectInfo: SubjectInfo = {
      subjectId: settingStore.installInfo.siteId,
      installTime: settingStore.installInfo.installTime,
      vipType: userStore.plusInfo.vipType || "free",
      expiresTime: userStore.plusInfo.expireTime
    };
    return subjectInfo;
  });

  let preBindUserId = null;
  iframeClient.register("preBindUser", async (req) => {
    const userId = req.data.userId;
    preBindUserId = userId;
    await api.PreBindUser(userId);
  });

  iframeClient.register("onBoundUser", async (req) => {
    await api.BindUser(preBindUserId);
  });

  iframeClient.register("unbindUser", async (req) => {
    const userId = req.data.userId;
    await api.UnbindUser(userId);
  });

  iframeClient.register("updateLicense", async (req) => {
    await api.UpdateLicense(req.data);
    await userStore.reInit();
    notification.success({
      message: "更新成功",
      description: "专业版已激活"
    });
  });
});
</script>

<style lang="less">
.cd-page-account {
  .fs-page-content {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  .account-iframe {
    width: 100%;
    height: 100%;
    border: none;
  }
}
</style>
