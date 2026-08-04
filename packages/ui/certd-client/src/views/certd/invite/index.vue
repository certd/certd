<template>
  <fs-page class="page-invite">
    <template #header>
      <div class="title">
        Incentive Program
        <span class="sub"> Invite friends and earn commission rewards </span>
      </div>
      <div class="more">
        <a-button type="primary" @click="openAgreementDialog(false)">Referral Agreement</a-button>
      </div>
    </template>

    <div v-if="loaded && enabled && inviteInfo.enabled" class="invite-body">
      <div class="invite-summary-grid">
        <div v-for="item in summaryCards" :key="item.key" class="summary-card">
          <div class="summary-card-main">
            <div class="summary-title">{{ item.title }}</div>
            <div class="summary-value" :class="item.className">{{ item.value }}</div>
          </div>
          <div v-if="item.key === 'totalIncome'" class="withdraw-action">
            <div class="withdraw-available">Withdrawable {{ moneyText(inviteInfo.wallet?.availableAmount) }}</div>
            <a-button class="summary-action-button" type="primary" @click="gotoWallet">Withdraw</a-button>
          </div>
        </div>
      </div>

      <div class="invite-link-panel">
        <div class="invite-info-row invite-highlight-row">
          <div class="info-icon">
            <fs-icon icon="ion:ticket-outline" />
          </div>
          <span class="info-label">Invitation Code</span>
          <div class="info-content">
            <fs-copyable v-model="inviteInfo.inviteCode" />
          </div>
        </div>

        <div class="invite-info-row invite-highlight-row">
          <div class="info-icon">
            <fs-icon icon="ion:link-outline" />
          </div>
          <span class="info-label">Invitation Link</span>
          <div class="info-content">
            <fs-copyable v-model="inviteInfo.inviteLink" />
          </div>
        </div>

        <div v-if="inviteInfo.levelEnabled" class="invite-info-row invite-highlight-row level-highlight-row" @click="levelDialogOpen = true">
          <div class="info-icon level-info-icon">
            <fs-icon v-if="inviteInfo.currentLevel" :icon="levelIcon(inviteInfo.currentLevel)" />
            <fs-icon v-else icon="ion:ribbon-outline" />
          </div>
          <span class="info-label">My Level</span>
          <div class="info-content level-info-content">
            <span class="level-name-text">{{ inviteInfo.currentLevel?.name || "Not set" }}</span>
            <span v-if="inviteInfo.currentLevel" class="current-level-rate">
              <span class="current-level-rate-label">Commission Rate</span>
              <span class="current-level-rate-value">{{ inviteInfo.currentLevel.commissionRate }}%</span>
            </span>
            <span v-if="inviteInfo.currentLevel" class="level-rate-desc">Commission is calculated at this rate after a friend pays</span>
          </div>
          <fs-icon class="level-open-icon" icon="ion:chevron-forward-outline" />
        </div>
        <div v-else class="invite-info-row invite-highlight-row">
          <div class="info-icon level-info-icon">
            <fs-icon icon="ion:cash-outline" />
          </div>
          <span class="info-label">Commission Rate</span>
          <div class="info-content level-info-content">
            <span class="current-level-rate fixed-rate-tag">
              <span class="current-level-rate-label">Rate</span>
              <span class="current-level-rate-value">{{ inviteInfo.fixedCommissionRate || 0 }}%</span>
            </span>
            <span class="level-rate-desc">Commission is calculated at this rate after a friend pays</span>
          </div>
        </div>
      </div>

      <a-tabs v-model:active-key="activeTab" class="invite-tabs" @change="handleTabChange">
        <a-tab-pane key="invitees" tab="Successful Invitations">
          <fs-crud v-if="activeTab === 'invitees'" ref="inviteesCrudRef" class="invite-crud" v-bind="inviteesCrudBinding" />
        </a-tab-pane>
        <a-tab-pane key="logs" tab="Earnings Records">
          <fs-crud v-if="activeTab === 'logs'" ref="logsCrudRef" class="invite-crud" v-bind="logsCrudBinding" />
        </a-tab-pane>
      </a-tabs>
    </div>

    <div v-else-if="loaded && enabled" class="invite-disabled">
      <a-empty description="Please enable the incentive program first">
        <a-button type="primary" @click="openAgreementDialog(true)">Enable Incentive Program</a-button>
      </a-empty>
    </div>
    <a-empty v-else-if="loaded" description="Incentive program is not enabled" />

    <a-modal v-if="inviteInfo.levelEnabled" v-model:open="levelDialogOpen" title="Referral Level" width="820px" wrap-class-name="invite-level-modal" :footer="null">
      <div class="level-modal-subtitle">The more you refer, the higher your level and commission rate</div>
      <div class="level-progress-box">
        <div>
          <div class="level-progress-label">Current cumulative referral amount</div>
          <div class="level-progress-value">¥ {{ amountToYuan(inviteInfo.summary.promotionAmount) }}</div>
        </div>
        <div class="level-progress-desc">
          <template v-if="inviteInfo.currentLevel?.levelType === 'exclusive'">Current level is exclusive and does not participate in automatic upgrades</template>
          <template v-else-if="inviteInfo.nextLevel">Remaining to next level "{{ inviteInfo.nextLevel.name }}": {{ amountToYuan(inviteInfo.nextLevel.gapAmount) }} yuan</template>
          <template v-else>You have reached the highest level available for automatic upgrade</template>
        </div>
      </div>
      <div class="level-card-grid modal-level-grid">
        <div v-for="level in visibleLevels" :key="level.id" class="level-card" :class="{ active: level.id === inviteInfo.currentLevel?.id, exclusive: level.levelType === 'exclusive' }">
          <div class="level-name">
            <span class="level-medal">
              <fs-icon :icon="levelIcon(level)" />
            </span>
            {{ level.name }}
            <a-tag v-if="level.levelType === 'exclusive'" color="orange">Exclusive</a-tag>
          </div>
          <div class="level-rate-label">Commission Rate</div>
          <div class="level-rate">{{ level.commissionRate }}%</div>
          <div v-if="level.levelType === 'exclusive'" class="level-threshold exclusive-threshold">Platform-assigned exclusive level</div>
          <div v-else class="level-threshold">Cumulative referrals >= {{ amountToYuan(level.minAmount) }} yuan</div>
          <a-tag v-if="level.id === inviteInfo.currentLevel?.id" class="current-tag" color="blue">Current Level</a-tag>
          <div v-else-if="level.id === inviteInfo.nextLevel?.id" class="next-gap">Remaining {{ amountToYuan(inviteInfo.nextLevel.gapAmount) }}</div>
        </div>
      </div>
    </a-modal>

    <a-modal
      v-model:open="agreementDialogOpen"
      :title="agreementDialogNeedOpen ? 'Enable Incentive Program' : 'Referral Agreement'"
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
        <a-checkbox v-model:checked="agreementAgree">I have read and agree to the referral agreement</a-checkbox>
      </div>
      <template #footer>
        <a-button @click="closeAgreementDialog">{{ agreementDialogNeedOpen ? "Not now" : "Close" }}</a-button>
        <a-button v-if="agreementDialogNeedOpen" type="primary" :disabled="!agreementAgree" :loading="agreementSubmitting" @click="handleAgreementOk">Agree and enable</a-button>
      </template>
    </a-modal>
  </fs-page>
</template>

<script lang="ts" setup>
import { computed, nextTick, reactive, ref } from "vue";
import { FsIcon, useFs } from "@fast-crud/fast-crud";
import { notification } from "ant-design-vue";
import { useRouter } from "vue-router";
import * as api from "./api";
import createInviteesCrudOptions from "./crud-invitees";
import createLogsCrudOptions from "./crud-logs";
import { useSettingStore } from "/@/store/settings";
import { util } from "/@/utils";
import { useMounted } from "/@/use/use-mounted";

defineOptions({ name: "InviteCommission" });

const router = useRouter();
const settingStore = useSettingStore();
const enabled = ref(false);
const activeTab = ref("invitees");
const loaded = ref(false);
const levelDialogOpen = ref(false);
const agreementDialogOpen = ref(false);
const agreementDialogNeedOpen = ref(false);
const agreementAgree = ref(false);
const agreementSubmitting = ref(false);
const defaultAgreementContent = "<p>Please follow the platform referral rules. Do not obtain earnings through fake registrations, fraudulent orders, or misleading referrals. The platform may review abnormal referral behavior and may suspend settlement or disable incentive eligibility based on the situation.</p>";

const inviteInfo = reactive<any>({
  enabled: false,
  inviteCode: "",
  inviteLink: "",
  agreementContent: "",
  summary: { totalIncomeAmount: 0, monthIncomeAmount: 0, promotionAmount: 0, inviteeCount: 0 },
  wallet: { availableAmount: 0 },
  levelEnabled: false,
  fixedCommissionRate: 10,
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
    title: "Total Earnings",
    value: moneyText(inviteInfo.summary.totalIncomeAmount),
    className: "income",
  },
  {
    key: "monthIncome",
    title: "This Month Earnings",
    value: moneyText(inviteInfo.summary.monthIncomeAmount),
    className: "income",
  },
  {
    key: "promotionAmount",
    title: "Total Referral Amount",
    value: moneyText(inviteInfo.summary.promotionAmount),
    className: "promotion",
  },
  {
    key: "inviteeCount",
    title: "Referred Users",
    value: `${inviteInfo.summary.inviteeCount || 0} users`,
    className: "people",
  },
]);

const visibleLevels = computed(() => {
  return (inviteInfo.levelList || []).filter((level: any) => {
    if (level.disabled) {
      return false;
    }
    return level.levelType !== "exclusive" || level.id === inviteInfo.currentLevel?.id;
  });
});

const agreementText = computed(() => inviteInfo.agreementContent?.trim() || defaultAgreementContent);

function levelIcon(level: any) {
  return level?.icon || "ion:ribbon-outline";
}

function gotoWallet() {
  router.push({ path: "/certd/wallet" });
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
    notification.warning({ message: "Please agree to the referral agreement first" });
    return;
  }
  agreementSubmitting.value = true;
  try {
    await api.OpenInvitePlan();
    notification.success({ message: "Incentive program enabled" });
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
  await settingStore.init();
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

// 页面打开后获取列表数据
useMounted(async () => {
  await refreshInvitePage(true);
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
    grid-template-columns: repeat(4, minmax(0, 1fr));
    margin-bottom: 18px;
  }

  .summary-card,
  .invite-link-panel {
    border: 1px solid rgba(148, 163, 184, 0.28);
    border-radius: 8px;
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.94), rgba(248, 250, 252, 0.82)), hsl(var(--card));
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
    transition:
      transform 0.18s ease,
      box-shadow 0.18s ease,
      border-color 0.18s ease;
  }

  .summary-card:hover,
  .invite-link-panel:hover {
    border-color: rgba(52, 120, 246, 0.34);
    box-shadow: 0 16px 38px rgba(15, 23, 42, 0.12);
    transform: translateY(-2px);
  }

  .summary-card {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 112px;
    overflow: hidden;
    padding: 22px;
  }

  .summary-card-main {
    min-width: 0;
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

  .summary-value.promotion {
    color: #16a085;
  }

  .summary-action-button {
    flex: none;
    min-width: 72px;
  }

  .withdraw-action {
    display: flex;
    align-items: flex-end;
    flex: none;
    flex-direction: column;
    gap: 8px;
  }

  .withdraw-available {
    color: hsl(var(--muted-foreground));
    font-size: 12px;
    line-height: 18px;
    white-space: nowrap;
  }

  .invite-link-panel {
    flex: none;
    padding: 16px 18px;
    margin-bottom: 18px;
  }

  .invite-info-row {
    display: flex;
    align-items: center;
    min-height: 34px;
    gap: 10px;
  }

  .invite-highlight-row {
    min-height: 48px;
    padding: 8px 12px;
    border: 1px solid rgba(52, 120, 246, 0.16);
    border-radius: 8px;
    background: rgba(248, 250, 252, 0.72);
    transition:
      border-color 0.18s ease,
      background-color 0.18s ease,
      box-shadow 0.18s ease;
  }

  .invite-highlight-row:hover {
    border-color: rgba(52, 120, 246, 0.34);
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
  }

  .level-highlight-row {
    cursor: pointer;
  }

  .level-info-icon {
    color: #8a5a16;
    font-size: 20px;
  }

  .invite-info-row + .invite-info-row {
    margin-top: 8px;
  }

  .info-icon {
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: 1px solid rgba(52, 120, 246, 0.14);
    border-radius: 8px;
    background: rgba(52, 120, 246, 0.08);
    color: #3478f6;
    font-size: 17px;
  }

  .info-label {
    width: 72px;
    flex: none;
    color: hsl(var(--foreground));
    font-size: 13px;
    font-weight: 600;
    text-align: left;
    white-space: nowrap;
  }

  .info-content {
    flex: 1;
    min-width: 0;
  }

  .current-level-rate {
    display: inline-flex;
    align-items: center;
    flex: none;
    height: 26px;
    margin-left: 6px;
    overflow: hidden;
    border: 1px solid rgba(197, 138, 53, 0.22);
    border-radius: 6px;
    background: rgba(197, 138, 53, 0.08);
    color: #c58a35;
    font-size: 13px;
    font-weight: 700;
  }

  .current-level-rate-label {
    height: 100%;
    padding: 0 8px;
    border-right: 1px solid rgba(197, 138, 53, 0.18);
    background: rgba(197, 138, 53, 0.1);
    color: #8a5a16;
    font-weight: 500;
    line-height: 24px;
  }

  .current-level-rate-value {
    padding: 0 8px;
    line-height: 24px;
  }

  .fixed-rate-tag {
    margin-left: 0;
  }

  .level-info-content {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    flex-wrap: wrap;
  }

  .level-name-text {
    flex: none;
    color: hsl(var(--foreground));
    font-weight: 600;
  }

  .level-rate-desc {
    min-width: 180px;
    color: hsl(var(--muted-foreground));
    font-size: 12px;
    line-height: 20px;
  }

  .level-open-icon {
    flex: none;
    color: hsl(var(--muted-foreground));
    font-size: 16px;
    transition: transform 0.18s ease;
  }

  .level-highlight-row:hover .level-open-icon {
    transform: translateX(2px);
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
    border: 1px solid rgba(148, 163, 184, 0.28);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
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
    overflow: hidden;
    border: 1px solid rgba(148, 163, 184, 0.28);
    border-radius: 8px;
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.94), rgba(248, 250, 252, 0.8)), linear-gradient(135deg, rgba(197, 138, 53, 0.14), rgba(52, 120, 246, 0.12));
    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.08);
    transition:
      transform 0.18s ease,
      box-shadow 0.18s ease,
      border-color 0.2s,
      background-color 0.2s;
  }

  .level-card:hover {
    border-color: rgba(52, 120, 246, 0.38);
    box-shadow: 0 14px 30px rgba(15, 23, 42, 0.12);
    transform: translateY(-2px);
  }

  .level-card.active {
    border-color: #3478f6;
    background: linear-gradient(145deg, rgba(236, 244, 255, 0.92), rgba(248, 250, 252, 0.88)), hsl(var(--primary) / 10%);
  }

  .level-card.exclusive {
    border-color: rgba(147, 51, 234, 0.36);
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.94), rgba(250, 245, 255, 0.86)), linear-gradient(135deg, rgba(147, 51, 234, 0.24), rgba(245, 158, 11, 0.2));
    box-shadow: 0 10px 28px rgba(88, 28, 135, 0.14);
  }

  .level-card.exclusive.active {
    border-color: rgba(147, 51, 234, 0.64);
    background: linear-gradient(145deg, rgba(250, 245, 255, 0.96), rgba(255, 251, 235, 0.9)), linear-gradient(135deg, rgba(147, 51, 234, 0.28), rgba(245, 158, 11, 0.24));
    box-shadow: 0 14px 34px rgba(88, 28, 135, 0.2);
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

  .exclusive-threshold {
    color: #8a5a16;
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

.level-progress-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px;
  border: 1px solid rgba(52, 120, 246, 0.16);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.86);
}

.level-progress-label {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}

.level-progress-value {
  margin-top: 2px;
  color: #16a085;
  font-size: 22px;
  font-weight: 700;
  line-height: 28px;
}

.level-progress-desc {
  color: #3478f6;
  font-size: 13px;
  text-align: right;
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

    .level-progress-box {
      align-items: flex-start;
      flex-direction: column;
    }

    .level-progress-desc {
      text-align: left;
    }
  }
}
</style>
