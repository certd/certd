<template>
  <fs-page class="cd-page-account">
    <iframe ref="iframeRef" class="account-iframe" src="http://localhost:1017/#/?appKey=z4nXOeTeSnnpUpnmsV"> </iframe>
  </fs-page>
</template>

<script setup lang="tsx">
import { IframeClient } from "@certd/lib-iframe";
import { onMounted, ref } from "vue";
import { useUserStore } from "/@/store/modules/user";
import { useSettingStore } from "/@/store/modules/settings";
import * as api from "./api";
const iframeRef = ref();

const userStore = useUserStore();
const settingStore = useSettingStore();
type SubjectInfo = {
  subjectId: string;
  installTime?: number;
  vipType?: string;
  expiresTime?: number;
};
onMounted(() => {
  const iframeClient = new IframeClient(iframeRef.value);
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
