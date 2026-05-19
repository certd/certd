<template>
  <fs-page class="page-invite">
    <template #header>
      <div class="title">激励计划</div>
    </template>
    <div v-if="loaded && enabled && inviteInfo.enabled" class="invite-body">
      <div class="invite-summary">
        <a-row :gutter="16">
          <a-col :span="6">
            <a-statistic title="累计收益" :value="amountToYuan(inviteInfo.summary.totalIncomeAmount)" suffix="元" />
          </a-col>
          <a-col :span="6">
            <a-statistic title="本月收益" :value="amountToYuan(inviteInfo.summary.monthIncomeAmount)" suffix="元" />
          </a-col>
          <a-col :span="6">
            <a-statistic title="推广人数" :value="inviteInfo.summary.inviteeCount || 0" suffix="人" />
          </a-col>
          <a-col :span="6">
            <a-statistic title="累计推广金额" :value="amountToYuan(inviteInfo.summary.promotionAmount)" suffix="元" />
          </a-col>
        </a-row>
      </div>

      <div class="invite-main">
        <div class="invite-link-row flex-o">
          <span class="label">邀请码：</span>
          <fs-copyable v-model="inviteInfo.inviteCode" />
        </div>
        <div class="invite-link-row flex-o mt-10">
          <span class="label">邀请链接：</span>
          <fs-copyable v-model="inviteInfo.inviteLink" />
        </div>
        <div class="invite-link-row flex-o mt-10">
          <span class="label">我的等级：</span>
          <a-button type="link" class="level-button" @click="levelDialogOpen = true">
            {{ inviteInfo.currentLevel?.name || "未设置" }}
            <span v-if="inviteInfo.currentLevel">（{{ inviteInfo.currentLevel.commissionRate }}%）</span>
          </a-button>
          <a-button size="small" @click="openAgreementDialog(false)">查看推广协议</a-button>
        </div>
      </div>

      <a-tabs v-model:active-key="activeTab" class="invite-tabs">
        <a-tab-pane key="invitees" tab="推广成功">
          <fs-crud v-if="activeTab === 'invitees'" ref="inviteesCrudRef" class="invite-crud" v-bind="inviteesCrudBinding" />
        </a-tab-pane>
        <a-tab-pane key="logs" tab="收益记录">
          <fs-crud v-if="activeTab === 'logs'" ref="logsCrudRef" class="invite-crud" v-bind="logsCrudBinding" />
        </a-tab-pane>
      </a-tabs>
    </div>
    <div v-else-if="loaded && enabled" class="invite-disabled">
      <a-empty description="请先开通激励计划">
        <a-button type="primary" @click="openAgreementDialog(true)">开通激励计划</a-button>
      </a-empty>
    </div>
    <a-empty v-else-if="loaded" description="激励计划未开启" />

    <a-modal v-model:open="levelDialogOpen" title="推广等级" width="720px" :footer="null">
      <div class="level-list">
        <div v-for="level in inviteInfo.levelList" :key="level.id" class="level-item" :class="{ active: level.id === inviteInfo.currentLevel?.id }">
          <div class="level-title">
            <span>{{ level.name }}</span>
            <a-tag v-if="level.id === inviteInfo.currentLevel?.id" color="green">当前等级</a-tag>
            <a-tag v-if="level.isHidden" color="orange">专属等级</a-tag>
          </div>
          <div class="level-meta">佣金比例 {{ level.commissionRate }}%，累计推广金额达到 {{ amountToYuan(level.minAmount) }} 元</div>
        </div>
        <div v-if="inviteInfo.nextLevel" class="next-level">距离下一等级「{{ inviteInfo.nextLevel.name }}」还差 {{ amountToYuan(inviteInfo.nextLevel.gapAmount) }} 元推广金额</div>
        <div v-else class="next-level">已达到当前可自动升级的最高等级</div>
      </div>
    </a-modal>
  </fs-page>
</template>

<script lang="ts" setup>
import { h, nextTick, onActivated, onMounted, reactive, ref } from "vue";
import { useFs } from "@fast-crud/fast-crud";
import { notification } from "ant-design-vue";
import * as api from "./api";
import createInviteesCrudOptions from "./crud-invitees";
import createLogsCrudOptions from "./crud-logs";
import { useSettingStore } from "/@/store/settings";
import { util } from "/@/utils";
import { useFormDialog } from "/@/use/use-dialog";

defineOptions({ name: "InviteCommission" });

const settingStore = useSettingStore();
const enabled = ref(false);
const activeTab = ref("invitees");
const loaded = ref(false);
const levelDialogOpen = ref(false);
const { openFormDialog } = useFormDialog();

const inviteInfo = reactive<any>({
  enabled: false,
  inviteCode: "",
  inviteLink: "",
  agreementContent: "",
  summary: { totalIncomeAmount: 0, monthIncomeAmount: 0, promotionAmount: 0, inviteeCount: 0 },
  currentLevel: null,
  nextLevel: null,
  levelList: [],
});

const { crudBinding: inviteesCrudBinding, crudExpose: inviteesCrudExpose, crudRef: inviteesCrudRef } = useFs({ createCrudOptions: createInviteesCrudOptions });
const { crudBinding: logsCrudBinding, crudExpose: logsCrudExpose, crudRef: logsCrudRef } = useFs({ createCrudOptions: createLogsCrudOptions });

function amountToYuan(amount: number) {
  return util.amount.toYuan(amount || 0);
}

function renderAgreement() {
  return h("div", { class: "invite-agreement-content" }, inviteInfo.agreementContent || "暂无推广协议内容");
}

async function openAgreementDialog(needOpenPlan: boolean) {
  await openFormDialog({
    title: needOpenPlan ? "开通激励计划" : "推广协议",
    wrapper: {
      width: 720,
      maskClosable: !needOpenPlan,
      keyboard: !needOpenPlan,
    },
    initialForm: {
      agree: false,
    },
    body: renderAgreement,
    columns: needOpenPlan
      ? {
          agree: {
            title: "确认",
            type: "text",
            form: {
              col: { span: 24 },
              component: {
                name: "a-checkbox",
                vModel: "checked",
              },
              rules: [
                {
                  validator: async (_rule: any, value: boolean) => {
                    if (value === true) {
                      return true;
                    }
                    throw new Error("请勾选同意推广协议");
                  },
                },
              ],
              helper: "我已阅读并同意推广协议",
            },
          },
        }
      : {},
    async onSubmit(form: any) {
      if (!needOpenPlan) {
        return;
      }
      if (form.agree !== true) {
        throw new Error("请勾选同意推广协议");
      }
      await api.OpenInvitePlan();
      notification.success({ message: "激励计划已开通" });
      await refreshInvitePage(true, false);
    },
  });
}

async function loadMyInvite(autoOpenAgreement = false) {
  const res: any = await api.GetMyInvite();
  Object.assign(inviteInfo, res || {});
  if (autoOpenAgreement && !inviteInfo.enabled) {
    await nextTick();
    await openAgreementDialog(true);
  }
}

async function refreshActiveList() {
  if (!inviteInfo.enabled) {
    return;
  }
  if (activeTab.value === "invitees") {
    await inviteesCrudExpose.doRefresh();
  } else if (activeTab.value === "logs") {
    await logsCrudExpose.doRefresh();
  }
}

async function refreshInvitePage(refreshAll = false, autoOpenAgreement = true) {
  await settingStore.initOnce();
  enabled.value = settingStore.isInviteCommissionEnabled;
  loaded.value = true;
  if (!enabled.value) {
    return;
  }
  await loadMyInvite(autoOpenAgreement);
  if (!inviteInfo.enabled) {
    return;
  }
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

  .invite-disabled {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
  }

  .invite-summary,
  .invite-main {
    flex: none;
  }

  .invite-summary {
    margin-bottom: 16px;
  }

  .invite-main {
    margin-bottom: 12px;
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

  .level-button {
    padding-left: 0;
    margin-right: 12px;
  }
}

.invite-agreement-content {
  max-height: 360px;
  padding: 12px;
  overflow: auto;
  white-space: pre-wrap;
  border: 1px solid #eee;
  border-radius: 6px;
  background: #fafafa;
  line-height: 1.7;
}

.level-list {
  .level-item {
    padding: 12px 14px;
    border: 1px solid #eee;
    border-radius: 6px;
    margin-bottom: 10px;
  }

  .level-item.active {
    border-color: #52c41a;
    background: #f6ffed;
  }

  .level-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
  }

  .level-meta {
    margin-top: 6px;
    color: #666;
  }

  .next-level {
    margin-top: 12px;
    color: #1677ff;
  }
}
</style>
