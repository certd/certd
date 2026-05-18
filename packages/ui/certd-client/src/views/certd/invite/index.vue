<template>
  <fs-page class="page-invite">
    <template #header>
      <div class="title">邀请返佣</div>
    </template>
    <div v-if="loaded && enabled" class="invite-body">
      <div class="invite-link-row flex-o">
        <span class="label">邀请码：</span>
        <fs-copyable v-model="inviteInfo.inviteCode" />
      </div>
      <div class="invite-link-row flex-o mt-10">
        <span class="label">邀请链接：</span>
        <fs-copyable v-model="inviteInfo.inviteLink" />
      </div>

      <a-tabs v-model:active-key="activeTab" class="invite-tabs mt-6">
        <a-tab-pane key="invitees" tab="邀请成功">
          <fs-crud v-if="activeTab === 'invitees'" ref="inviteesCrudRef" class="invite-crud" v-bind="inviteesCrudBinding" />
        </a-tab-pane>
        <a-tab-pane key="logs" tab="佣金记录">
          <fs-crud v-if="activeTab === 'logs'" ref="logsCrudRef" class="invite-crud" v-bind="logsCrudBinding" />
        </a-tab-pane>
      </a-tabs>
    </div>
    <a-empty v-else-if="loaded" description="邀请返佣未开启" />
  </fs-page>
</template>

<script lang="ts" setup>
import { computed, nextTick, onActivated, onMounted, reactive, ref } from "vue";
import { useFs } from "@fast-crud/fast-crud";
import * as api from "./api";
import createInviteesCrudOptions from "./crud-invitees";
import createLogsCrudOptions from "./crud-logs";
import { useSettingStore } from "/@/store/settings";

defineOptions({ name: "InviteCommission" });

const settingStore = useSettingStore();
const enabled = computed(() => settingStore.isInviteCommissionEnabled);
const activeTab = ref("invitees");
const inviteInfo = reactive<any>({ inviteCode: "", inviteLink: "" });
const loaded = ref(false);

const { crudBinding: inviteesCrudBinding, crudExpose: inviteesCrudExpose, crudRef: inviteesCrudRef } = useFs({ createCrudOptions: createInviteesCrudOptions });
const { crudBinding: logsCrudBinding, crudExpose: logsCrudExpose, crudRef: logsCrudRef } = useFs({ createCrudOptions: createLogsCrudOptions });

async function loadMyInvite() {
  const res: any = await api.GetMyInvite();
  inviteInfo.inviteCode = res.inviteCode;
  inviteInfo.inviteLink = res.inviteLink;
}

async function refreshActiveList() {
  if (activeTab.value === "invitees") {
    await inviteesCrudExpose.doRefresh();
  } else if (activeTab.value === "logs") {
    await logsCrudExpose.doRefresh();
  }
}

async function refreshInvitePage(refreshAll = false) {
  await settingStore.initOnce();
  loaded.value = true;
  if (!enabled.value) {
    return;
  }
  await loadMyInvite();
  await nextTick();
  if (refreshAll) {
    await Promise.all([inviteesCrudExpose.doRefresh(), logsCrudExpose.doRefresh()]);
    return;
  }
  await refreshActiveList();
}

onMounted(async () => {
  await refreshInvitePage(true);
});

onActivated(async () => {
  if (!loaded.value) {
    return;
  }
  await refreshInvitePage();
});
</script>

<style lang="less">
.page-invite {
  display: flex;
  min-height: 0;

  .fs-page-content {
    display: flex;
    min-height: 0;
  }

  .invite-body {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    padding: 20px;
  }

  .invite-tabs {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }

  .ant-tabs-content-holder,
  .ant-tabs-content,
  .ant-tabs-tabpane {
    display: flex;
    flex: 1;
    min-height: 0;
  }

  .ant-tabs-tabpane {
    flex-direction: column;
  }

  .invite-crud {
    flex: 1;
    min-height: 0;
  }
  .label {
    width: 80px;
    flex: none;
    text-align: right;
    margin-right: 8px;
  }
}
</style>
