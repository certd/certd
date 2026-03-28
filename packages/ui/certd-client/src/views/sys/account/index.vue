<template>
  <fs-page class="cd-page-account">
    <!--    <template #header>-->
    <!--      <div class="title">-->
    <!--        站点绑定-->
    <!--        <span class="sub">管理你安装过的Certd站点，可以通过转移功能避免丢失VIP，强烈建议绑定</span>-->
    <!--      </div>-->
    <!--    </template>-->

    <iframe ref="iframeRef" class="account-iframe" :src="iframeSrcRef"> </iframe>
  </fs-page>
</template>

<script setup lang="tsx">
import { IframeClient } from "@certd/lib-iframe";
import { computed, onMounted, ref } from "vue";
import { useUserStore } from "/@/store/user";
import { useSettingStore } from "/@/store/settings";
import * as api from "./api";
import { notification } from "ant-design-vue";

defineOptions({
  name: "AccountBind",
});
const iframeRef = ref();

const userStore = useUserStore();
const settingStore = useSettingStore();

const iframeSrcRef = computed(() => {
  if (!settingStore.installInfo.accountServerBaseUrl) {
    return "#/app/certd/home";
  }
  const timestamp = Date.now();
  return `${settingStore.installInfo.accountServerBaseUrl}/#/app/certd/home?t=${timestamp}`;
});

type SubjectInfo = {
  subjectId: string;
  installAt?: number;
  vipType?: string;
  expiresAt?: number;
};
onMounted(() => {
  const iframeClient = new IframeClient(iframeRef.value, (e: any) => {
    notification.error({
      message: " error",
      description: e.message,
    });
  });
  iframeClient.register("getSubjectInfo", async (req: any) => {
    const subjectInfo: SubjectInfo = {
      subjectId: settingStore.installInfo.siteId,
      installAt: settingStore.installInfo.installTime,
      vipType: settingStore.plusInfo.vipType || "free",
      expiresAt: settingStore.plusInfo.expireTime,
    };
    return subjectInfo;
  });

  let preBindUserId: any = null;
  iframeClient.register("preBindUser", async req => {
    const userId = req.data.userId;
    preBindUserId = userId;
    await api.PreBindUser(userId);
  });

  iframeClient.register("onBoundUser", async req => {
    await api.BindUser(preBindUserId);
  });

  iframeClient.register("unbindUser", async req => {
    const userId = req.data.userId;
    await api.UnbindUser(userId);
  });

  iframeClient.register("updateLicense", async req => {
    await api.UpdateLicense(req.data);
    await settingStore.init();
    await settingStore.doBindUrl();
    notification.success({
      message: "更新成功",
      description: "Certd专业版/商业版已激活",
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
