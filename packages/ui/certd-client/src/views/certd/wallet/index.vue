<template>
  <fs-page class="page-wallet">
    <template #header>
      <div class="title">{{ t("certd.wallet.title") }}</div>
    </template>
    <div class="wallet-body">
      <div class="wallet-summary-grid">
        <div v-for="item in summaryCards" :key="item.key" class="summary-card">
          <div class="summary-card-main">
            <div class="summary-title">{{ item.title }}</div>
            <div class="summary-value" :class="item.className">{{ item.value }}</div>
          </div>
          <a-button v-if="item.key === 'availableAmount'" class="summary-action-button" type="primary" @click="openWithdrawDialog">{{ t("certd.wallet.withdraw") }}</a-button>
        </div>
      </div>

      <a-tabs v-model:active-key="activeTab" class="wallet-tabs" @change="refreshActiveList">
        <a-tab-pane key="withdraw" :tab="t('certd.wallet.withdrawRecords')">
          <fs-crud v-if="activeTab === 'withdraw'" ref="withdrawCrudRef" class="wallet-crud" v-bind="withdrawCrudBinding" />
        </a-tab-pane>
        <a-tab-pane key="logs" :tab="t('certd.wallet.balanceLogs')">
          <fs-crud v-if="activeTab === 'logs'" ref="logsCrudRef" class="wallet-crud" v-bind="logsCrudBinding" />
        </a-tab-pane>
      </a-tabs>
    </div>
  </fs-page>
</template>

<script lang="ts" setup>
import { computed, h, reactive, ref } from "vue";
import { compute, dict, useFs } from "@fast-crud/fast-crud";
import { Button, notification } from "ant-design-vue";
import * as api from "./api";
import createLogsCrudOptions from "./crud-logs";
import createWithdrawCrudOptions from "./crud-withdraw";
import { util } from "/@/utils";
import { useFormDialog } from "/@/use/use-dialog";
import { useUserStore } from "/@/store/user";
import { useMounted } from "/@/use/use-mounted";
import { useI18n } from "/src/locales";

defineOptions({ name: "MyWallet" });

const summary = reactive<any>({ availableAmount: 0, frozenAmount: 0, totalIncomeAmount: 0, totalWithdrawAmount: 0 });
const loaded = ref(false);
const activeTab = ref("withdraw");
const { openFormDialog } = useFormDialog();
const userStore = useUserStore();
const { t } = useI18n();
const { crudBinding: withdrawCrudBinding, crudExpose: withdrawCrudExpose, crudRef: withdrawCrudRef } = useFs({ createCrudOptions: createWithdrawCrudOptions });
const { crudBinding: logsCrudBinding, crudExpose: logsCrudExpose, crudRef: logsCrudRef } = useFs({ createCrudOptions: createLogsCrudOptions });

function amountToYuan(amount: number) {
  return util.amount.toYuan(amount || 0);
}

function moneyText(amount: number) {
  return `¥ ${amountToYuan(amount)}`;
}

function buildPrivateFileUrl(key: string) {
  return `/api/basic/file/download?token=${userStore.getToken}&key=${encodeURIComponent(key)}`;
}

const summaryCards = computed(() => [
  {
    key: "availableAmount",
    title: t("certd.wallet.availableAmount"),
    value: moneyText(summary.availableAmount),
    className: "available",
  },
  {
    key: "frozenAmount",
    title: t("certd.wallet.frozenAmount"),
    value: moneyText(summary.frozenAmount),
    className: "frozen",
  },
  {
    key: "totalIncomeAmount",
    title: t("certd.wallet.totalIncomeAmount"),
    value: moneyText(summary.totalIncomeAmount),
    className: "income",
  },
  {
    key: "totalWithdrawAmount",
    title: t("certd.wallet.totalWithdrawAmount"),
    value: moneyText(summary.totalWithdrawAmount),
    className: "withdraw",
  },
]);

async function loadWalletSummary() {
  const res: any = await api.GetWalletSummary();
  Object.assign(summary, res || {});
}

async function openWithdrawSetting() {
  const [setting, walletSetting]: any[] = await Promise.all([api.GetWithdrawSetting(), api.GetWalletSetting()]);
  const enabledChannels = walletSetting?.withdrawChannels?.length ? walletSetting.withdrawChannels : ["alipay", "bank"];
  const enabledBanks = walletSetting?.withdrawBanks?.length ? walletSetting.withdrawBanks : [];
  const channelOptions = [
    { label: t("certd.wallet.alipay"), value: "alipay" },
    { label: t("certd.wallet.bank"), value: "bank" },
  ].filter(item => enabledChannels.includes(item.value));
  const bankOptions = enabledBanks.map((item: string) => ({ label: item, value: item }));
  const initialForm = Object.assign({ channel: "alipay", realName: "", account: "", bankName: "" }, setting || {});
  if (!enabledChannels.includes(initialForm.channel)) {
    initialForm.channel = enabledChannels[0] || "alipay";
  }
  await openFormDialog({
    title: t("certd.wallet.withdrawSetting"),
    wrapper: {
      width: 560,
    },
    initialForm,
    columns: {
      channel: {
        title: t("certd.wallet.channel"),
        type: "dict-radio",
        dict: dict({
          data: channelOptions,
        }),
        form: {
          col: { span: 24 },
          rules: [{ required: true, message: t("certd.wallet.selectChannel") }],
        },
      },
      realName: {
        title: t("certd.wallet.realName"),
        type: "text",
        form: {
          col: { span: 24 },
          rules: [{ required: true, message: t("certd.wallet.enterRealName") }],
        },
      },
      account: {
        title: t("certd.wallet.account"),
        type: "text",
        form: {
          col: { span: 24 },
          rules: [{ required: true, message: t("certd.wallet.enterAccount") }],
        },
      },
      qrCode: {
        title: t("certd.wallet.qrCode"),
        type: "avatar-uploader",
        form: {
          col: { span: 24 },
          helper: t("certd.wallet.uploadQrCode"),
          show: compute(({ form }) => form.channel !== "bank"),
          component: {
            valueType: "key",
            uploader: {
              type: "form",
              action: "/basic/file/upload?token=" + userStore.getToken,
              name: "file",
              headers: {
                Authorization: "Bearer " + userStore.getToken,
              },
              successHandle(res: any) {
                return res;
              },
            },
            buildUrl(key: string) {
              return buildPrivateFileUrl(key);
            },
          },
        },
      },
      bankName: {
        title: t("certd.wallet.bankName"),
        form: {
          col: { span: 24 },
          show: compute(({ form }) => form.channel === "bank"),
          component: {
            name: "a-select",
            vModel: "value",
            options: bankOptions,
            showSearch: true,
            placeholder: t("certd.wallet.selectBank"),
          },
          rules: [{ required: compute(({ form }) => form.channel === "bank"), message: t("certd.wallet.enterBankName") }],
        },
      },
    },
    async onSubmit(form: any) {
      if (form.channel === "bank") {
        form.qrCode = "";
      }
      await api.SaveWithdrawSetting(form);
      notification.success({ message: t("certd.wallet.saveSuccess") });
    },
  });
}

async function openWithdrawDialog() {
  await openFormDialog({
    title: t("certd.wallet.withdraw"),
    wrapper: {
      width: 520,
    },
    initialForm: {
      amountYuan: null,
    },
    body: () =>
      h("div", { class: "withdraw-dialog-tip" }, [
        h("span", t("certd.wallet.beforeWithdrawTip")),
        h(
          Button,
          {
            size: "small",
            type: "link",
            onClick: openWithdrawSetting,
          },
          () => t("certd.wallet.withdrawSetting")
        ),
      ]),
    columns: {
      amountYuan: {
        title: t("certd.wallet.amount"),
        form: {
          col: { span: 24 },
          component: {
            name: "a-input-number",
            vModel: "value",
            min: 0,
            precision: 2,
            addonAfter: t("certd.wallet.yuan"),
            style: { width: "100%" },
          },
          rules: [{ required: true, message: t("certd.wallet.enterAmount") }],
        },
      },
    },
    async onSubmit(form: any) {
      await applyWithdraw(form.amountYuan);
    },
  });
}

async function applyWithdraw(amountYuan: number) {
  await api.ApplyWithdraw(util.amount.toCent(amountYuan || 0));
  activeTab.value = "withdraw";
  await loadWalletSummary();
  await Promise.all([withdrawCrudExpose.doRefresh(), logsCrudExpose.doRefresh()]);
  notification.success({ message: t("certd.wallet.submitSuccess") });
}

async function refreshActiveList() {
  if (activeTab.value === "withdraw") {
    await withdrawCrudExpose.doRefresh();
  } else if (activeTab.value === "logs") {
    await logsCrudExpose.doRefresh();
  }
}

async function refreshWalletPage() {
  await loadWalletSummary();
  await refreshActiveList();
  loaded.value = true;
}

// 页面打开后获取列表数据
useMounted(refreshWalletPage);
</script>

<style lang="less">
.page-wallet {
  display: flex;
  min-height: 0;

  .fs-page-content {
    display: flex;
    min-height: 0;
  }

  .wallet-body {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    padding: 20px;
    background: hsl(var(--background-deep));
  }

  .wallet-summary-grid {
    flex: none;
  }

  .wallet-summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 18px;
  }

  .summary-card,
  .wallet-tabs {
    border: 1px solid rgba(148, 163, 184, 0.28);
    border-radius: 8px;
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.94), rgba(248, 250, 252, 0.82)), hsl(var(--card));
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
    transition:
      transform 0.18s ease,
      box-shadow 0.18s ease,
      border-color 0.18s ease;
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

  .summary-card:hover {
    border-color: rgba(52, 120, 246, 0.34);
    box-shadow: 0 16px 38px rgba(15, 23, 42, 0.12);
    transform: translateY(-2px);
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

  .summary-value.available,
  .summary-value.income {
    color: #c58a35;
  }

  .summary-value.frozen {
    color: #8b96a8;
  }

  .summary-value.withdraw {
    color: #3478f6;
  }

  .summary-action-button {
    flex: none;
    box-shadow: 0 8px 18px rgba(52, 120, 246, 0.22);
  }

  .wallet-tabs {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    padding: 0 12px 12px;
    background: rgba(255, 255, 255, 0.92);
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

  .wallet-crud {
    flex: 1;
    min-height: 0;
  }

  .wallet-tabs {
    .fs-search {
      display: none;
    }
  }
}

@media (max-width: 900px) {
  .page-wallet {
    .wallet-summary-grid {
      grid-template-columns: 1fr;
    }

    .summary-card {
      align-items: flex-start;
      flex-direction: column;
    }
  }
}

.withdraw-dialog-tip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  margin-bottom: 12px;
  border: 1px solid #d9e8ff;
  border-radius: 6px;
  background: #f5f9ff;
  color: #315174;
}
</style>
