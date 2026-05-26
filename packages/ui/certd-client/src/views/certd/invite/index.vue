<template>
  <fs-page class="page-invite">
    <template #header>
      <div class="title">
        激励计划
        <span class="sub"> 邀请好友，获取丰厚佣金奖励 </span>
      </div>
      <div class="more">
        <a-button type="primary" @click="openAgreementDialog(false)">推广协议</a-button>
      </div>
    </template>

    <div v-if="loaded && enabled && inviteInfo.enabled" class="invite-body">
      <div class="invite-summary-grid">
        <div v-for="item in summaryCards" :key="item.key" class="summary-card">
          <div class="summary-title">{{ item.title }}</div>
          <div class="summary-value" :class="item.className">{{ item.value }}</div>
        </div>
      </div>

      <div class="invite-link-panel">
        <div class="invite-info-row">
          <span class="info-label">邀请码：</span>
          <fs-copyable v-model="inviteInfo.inviteCode" />
        </div>

        <div class="invite-info-row">
          <span class="info-label">邀请链接：</span>
          <fs-copyable v-model="inviteInfo.inviteLink" />
        </div>

        <div class="invite-info-row">
          <span class="info-label">我的等级：</span>
          <a-button type="link" class="level-button" @click="levelDialogOpen = true">
            <span v-if="inviteInfo.currentLevel" class="level-medal">
              <fs-icon :icon="levelIcon(inviteInfo.currentLevel)" />
            </span>
            <span>{{ inviteInfo.currentLevel?.name || "未设置" }}</span>
            <span v-if="inviteInfo.currentLevel" class="current-level-rate">{{ inviteInfo.currentLevel.commissionRate }}%</span>
          </a-button>
        </div>
      </div>

      <a-tabs v-model:active-key="activeTab" class="invite-tabs" @change="handleTabChange">
        <a-tab-pane key="invitees" tab="推广成功用户">
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

    <a-modal v-model:open="levelDialogOpen" title="推广等级" width="820px" wrap-class-name="invite-level-modal" :footer="null">
      <div class="level-modal-subtitle">推广越多，等级越高，返佣比例越高</div>
      <div class="level-card-grid modal-level-grid">
        <div v-for="level in visibleLevels" :key="level.id" class="level-card" :class="{ active: level.id === inviteInfo.currentLevel?.id }">
          <div class="level-name">
            <span class="level-medal">
              <fs-icon :icon="levelIcon(level)" />
            </span>
            {{ level.name }}
            <a-tag v-if="level.levelType === 'exclusive'" color="orange">专属</a-tag>
          </div>
          <div class="level-rate-label">佣金比例</div>
          <div class="level-rate">{{ level.commissionRate }}%</div>
          <div class="level-threshold">累计推广 ≥ {{ amountToYuan(level.minAmount) }} 元</div>
          <a-tag v-if="level.id === inviteInfo.currentLevel?.id" class="current-tag" color="blue">当前等级</a-tag>
          <div v-else-if="level.id === inviteInfo.nextLevel?.id" class="next-gap">还差 {{ amountToYuan(inviteInfo.nextLevel.gapAmount) }}</div>
        </div>
      </div>
      <div v-if="inviteInfo.nextLevel" class="next-level">距离下一等级「{{ inviteInfo.nextLevel.name }}」还差 {{ amountToYuan(inviteInfo.nextLevel.gapAmount) }} 元推广金额</div>
      <div v-else class="next-level">已达到当前可自动升级的最高等级</div>
    </a-modal>

    <a-modal
      v-model:open="agreementDialogOpen"
      :title="agreementDialogNeedOpen ? '开通激励计划' : '推广协议'"
      width="760px"
      :mask-closable="!agreementDialogNeedOpen"
      :keyboard="!agreementDialogNeedOpen"
      :confirm-loading="agreementSubmitting"
      @ok="handleAgreementOk"
      @cancel="closeAgreementDialog"
    >
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="invite-agreement-content editor-content-view" v-html="agreementText"></div>
      <div v-if="agreementDialogNeedOpen" class="invite-agreement-confirm">
        <a-checkbox v-model:checked="agreementAgree">我已阅读并同意推广协议</a-checkbox>
      </div>
      <template #footer>
        <a-button @click="closeAgreementDialog">{{ agreementDialogNeedOpen ? "暂不开通" : "关闭" }}</a-button>
        <a-button v-if="agreementDialogNeedOpen" type="primary" :disabled="!agreementAgree" :loading="agreementSubmitting" @click="handleAgreementOk">同意并开通</a-button>
      </template>
    </a-modal>
  </fs-page>
</template>

<script lang="ts" setup>
import { computed, nextTick, onActivated, onMounted, reactive, ref } from "vue";
import { FsIcon, useFs } from "@fast-crud/fast-crud";
import { notification } from "ant-design-vue";
import * as api from "./api";
import createInviteesCrudOptions from "./crud-invitees";
import createLogsCrudOptions from "./crud-logs";
import { useSettingStore } from "/@/store/settings";
import { util } from "/@/utils";

defineOptions({ name: "InviteCommission" });

const settingStore = useSettingStore();
const enabled = ref(false);
const activeTab = ref("invitees");
const loaded = ref(false);
const levelDialogOpen = ref(false);
const agreementDialogOpen = ref(false);
const agreementDialogNeedOpen = ref(false);
const agreementAgree = ref(false);
const agreementSubmitting = ref(false);
const defaultAgreementContent = "<p>请遵守平台推广规则，不得通过虚假注册、刷单、恶意诱导等方式获取收益。平台有权对异常推广行为进行核查，并根据实际情况暂停结算或关闭激励计划资格。</p>";

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

function moneyText(amount: number) {
  return `¥ ${amountToYuan(amount)}`;
}

const summaryCards = computed(() => [
  {
    key: "totalIncome",
    title: "累计收益",
    value: moneyText(inviteInfo.summary.totalIncomeAmount),
    className: "income",
  },
  {
    key: "monthIncome",
    title: "本月收益",
    value: moneyText(inviteInfo.summary.monthIncomeAmount),
    className: "income",
  },
  {
    key: "inviteeCount",
    title: "已推广人数",
    value: `${inviteInfo.summary.inviteeCount || 0} 人`,
    className: "people",
  },
]);

const visibleLevels = computed(() => {
  return (inviteInfo.levelList || []).filter((level: any) => !level.disabled);
});

const agreementText = computed(() => inviteInfo.agreementContent?.trim() || defaultAgreementContent);

function levelIcon(level: any) {
  return level?.icon || "ion:ribbon-outline";
}

function openAgreementDialog(needOpenPlan: boolean) {
  agreementDialogNeedOpen.value = needOpenPlan;
  agreementAgree.value = false;
  agreementDialogOpen.value = true;
}

function closeAgreementDialog() {
  agreementDialogOpen.value = false;
}

async function handleAgreementOk() {
  if (!agreementDialogNeedOpen.value) {
    closeAgreementDialog();
    return;
  }
  if (!agreementAgree.value) {
    notification.warning({ message: "请先勾选同意推广协议" });
    return;
  }
  agreementSubmitting.value = true;
  try {
    await api.OpenInvitePlan();
    notification.success({ message: "激励计划已开通" });
    closeAgreementDialog();
    await refreshInvitePage(false);
  } finally {
    agreementSubmitting.value = false;
  }
}

async function loadMyInvite(autoOpenAgreement = false) {
  const res: any = await api.GetMyInvite();
  Object.assign(inviteInfo, res || {});
  if (autoOpenAgreement && !inviteInfo.enabled) {
    await nextTick();
    openAgreementDialog(true);
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

async function handleTabChange() {
  await nextTick();
  await refreshActiveList();
}

async function refreshInvitePage(autoOpenAgreement = true) {
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

  .invite-page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .invite-page-subtitle {
    margin-top: 4px;
    color: hsl(var(--muted-foreground));
    font-size: 13px;
    font-weight: 400;
  }

  .invite-body {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    padding: 20px;
    background: hsl(var(--background-deep));
  }

  .invite-disabled {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
  }

  .level-subtitle,
  .level-modal-subtitle {
    color: hsl(var(--muted-foreground));
    font-size: 14px;
  }

  .invite-summary-grid {
    display: grid;
    gap: 16px;
  }

  .invite-summary-grid {
    flex: none;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin-bottom: 18px;
  }

  .summary-card,
  .invite-link-panel {
    border: 1px solid hsl(var(--border));
    border-radius: 8px;
    background: hsl(var(--card));
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  }

  .summary-card {
    min-height: 112px;
    padding: 22px;
  }

  .summary-title {
    margin-bottom: 10px;
    color: hsl(var(--muted-foreground));
    font-size: 15px;
  }

  .summary-value {
    font-size: 30px;
    font-weight: 700;
    line-height: 36px;
  }

  .summary-value.income {
    color: #c58a35;
  }

  .summary-value.people {
    color: #3478f6;
  }

  .invite-link-panel {
    flex: none;
    padding: 14px 18px;
    margin-bottom: 18px;
  }

  .invite-info-row {
    display: flex;
    align-items: center;
    min-height: 34px;
    gap: 10px;
  }

  .invite-info-row + .invite-info-row {
    margin-top: 8px;
  }

  .info-label {
    width: 92px;
    flex: none;
    color: hsl(var(--muted-foreground));
    text-align: right;
    white-space: nowrap;
  }

  .current-level-rate {
    margin-left: 6px;
    color: #c58a35;
    font-weight: 700;
  }

  .level-button {
    display: inline-flex;
    align-items: center;
    height: 28px;
    padding-left: 0;
    gap: 4px;
  }

  .level-medal {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    color: #8a5a16;
    font-size: 20px;
  }

  .invite-tabs {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    padding: 0 12px 12px;
    border: 1px solid hsl(var(--border));
    border-radius: 8px;
    background: hsl(var(--card));
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

  .invite-tabs {
    .fs-search {
      display: none;
    }
  }
}

.invite-level-modal {
  .level-card-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
  }

  .level-card {
    position: relative;
    min-height: 132px;
    padding: 16px;
    border: 1px solid hsl(var(--border));
    border-radius: 8px;
    background: hsl(var(--card));
    transition:
      border-color 0.2s,
      background-color 0.2s;
  }

  .level-card.active {
    border-color: #3478f6;
    background: hsl(var(--primary) / 10%);
  }

  .level-name {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: hsl(var(--foreground));
    font-weight: 700;
  }

  .level-medal {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    color: #8a5a16;
    font-size: 20px;
  }

  .level-rate-label {
    margin-top: 12px;
    color: hsl(var(--muted-foreground));
    font-size: 12px;
    text-align: center;
  }

  .level-rate {
    margin-top: 2px;
    color: #c58a35;
    font-size: 24px;
    font-weight: 700;
    line-height: 30px;
    text-align: center;
  }

  .level-threshold,
  .next-gap {
    margin-top: 6px;
    color: hsl(var(--muted-foreground));
    font-size: 12px;
    text-align: center;
  }

  .current-tag {
    display: table;
    margin: 10px auto 0;
  }

  .next-gap {
    color: #3478f6;
  }
}

.modal-level-grid {
  margin-top: 12px;
}

.invite-agreement-content {
  max-height: 360px;
  padding: 12px;
  overflow: auto;
  border: 1px solid #eee;
  border-radius: 6px;
  background: hsl(var(--card));
  line-height: 1.7;

  :deep(img) {
    max-width: 100%;
    height: auto;
  }

  :deep(p) {
    margin-bottom: 10px;
  }
}

.invite-agreement-confirm {
  margin-top: 14px;
  padding: 10px 12px;
  border: 1px solid #e6f4ff;
  border-radius: 6px;
  background: #f5fbff;
}

.level-modal-subtitle {
  margin-bottom: 12px;
}

.next-level {
  margin-top: 16px;
  color: #3478f6;
}

@media (max-width: 900px) {
  .page-invite {
    .invite-summary-grid,
    .level-card-grid {
      grid-template-columns: 1fr;
    }

    .invite-info-row {
      align-items: stretch;
      flex-direction: column;
    }

    .info-label {
      width: auto;
      text-align: left;
    }
  }

  .invite-level-modal {
    .level-card-grid {
      grid-template-columns: 1fr;
    }
  }
}
</style>
