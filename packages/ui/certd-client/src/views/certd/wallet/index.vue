<template>
  <fs-page class="page-wallet">
    <template #header>
      <div class="title">我的钱包</div>
    </template>
    <div class="wallet-body">
      <div class="wallet-summary-grid">
        <div v-for="item in summaryCards" :key="item.key" class="summary-card">
          <div class="summary-title">{{ item.title }}</div>
          <div class="summary-value" :class="item.className">{{ item.value }}</div>
        </div>
      </div>

      <div class="wallet-action-panel">
        <div class="wallet-action-title">提现操作</div>
        <div class="wallet-action-content">
          <a-button type="primary" @click="openWithdrawSetting">提现设置</a-button>
          <a-input-number v-model:value="withdrawAmountYuan" class="withdraw-amount-input" :min="0" addon-before="提现金额" addon-after="元" />
          <a-button @click="applyWithdraw">申请提现</a-button>
        </div>
      </div>

      <a-tabs v-model:active-key="activeTab" class="wallet-tabs" @change="refreshActiveList">
        <a-tab-pane key="withdraw" tab="提现记录">
          <fs-crud v-if="activeTab === 'withdraw'" ref="withdrawCrudRef" class="wallet-crud" v-bind="withdrawCrudBinding" />
        </a-tab-pane>
        <a-tab-pane key="logs" tab="余额明细">
          <fs-crud v-if="activeTab === 'logs'" ref="logsCrudRef" class="wallet-crud" v-bind="logsCrudBinding" />
        </a-tab-pane>
      </a-tabs>
    </div>
  </fs-page>
</template>

<script lang="ts" setup>
import { computed, onActivated, onMounted, reactive, ref } from "vue";
import { compute, dict, useFs } from "@fast-crud/fast-crud";
import { notification } from "ant-design-vue";
import * as api from "./api";
import createLogsCrudOptions from "./crud-logs";
import createWithdrawCrudOptions from "./crud-withdraw";
import { util } from "/@/utils";
import { useFormDialog } from "/@/use/use-dialog";
import { useUserStore } from "/@/store/user";

defineOptions({ name: "MyWallet" });

const summary = reactive<any>({ availableAmount: 0, frozenAmount: 0, totalIncomeAmount: 0, totalWithdrawAmount: 0 });
const withdrawAmountYuan = ref(0);
const loaded = ref(false);
const activeTab = ref("withdraw");
const { openFormDialog } = useFormDialog();
const userStore = useUserStore();
const { crudBinding: withdrawCrudBinding, crudExpose: withdrawCrudExpose, crudRef: withdrawCrudRef } = useFs({ createCrudOptions: createWithdrawCrudOptions });
const { crudBinding: logsCrudBinding, crudExpose: logsCrudExpose, crudRef: logsCrudRef } = useFs({ createCrudOptions: createLogsCrudOptions });

function amountToYuan(amount: number) {
  return util.amount.toYuan(amount || 0);
}

function moneyText(amount: number) {
  return `¥ ${amountToYuan(amount)}`;
}

const summaryCards = computed(() => [
  {
    key: "availableAmount",
    title: "可用余额",
    value: moneyText(summary.availableAmount),
    className: "available",
  },
  {
    key: "frozenAmount",
    title: "冻结余额",
    value: moneyText(summary.frozenAmount),
    className: "frozen",
  },
  {
    key: "totalIncomeAmount",
    title: "累计收入",
    value: moneyText(summary.totalIncomeAmount),
    className: "income",
  },
  {
    key: "totalWithdrawAmount",
    title: "累计提现",
    value: moneyText(summary.totalWithdrawAmount),
    className: "withdraw",
  },
]);

async function loadWalletSummary() {
  const res: any = await api.GetWalletSummary();
  Object.assign(summary, res || {});
}

async function openWithdrawSetting() {
  const setting: any = await api.GetWithdrawSetting();
  const initialForm = Object.assign({ channel: "alipay", realName: "", account: "", bankName: "" }, setting || {});
  await openFormDialog({
    title: "提现设置",
    wrapper: {
      width: 560,
    },
    initialForm,
    columns: {
      channel: {
        title: "提现渠道",
        type: "dict-radio",
        dict: dict({
          data: [
            { label: "支付宝", value: "alipay" },
            { label: "银行卡", value: "bank" },
          ],
        }),
        form: {
          col: { span: 24 },
          rules: [{ required: true, message: "请选择提现渠道" }],
        },
      },
      realName: {
        title: "真实姓名",
        type: "text",
        form: {
          col: { span: 24 },
          rules: [{ required: true, message: "请输入真实姓名" }],
        },
      },
      account: {
        title: "收款账号",
        type: "text",
        form: {
          col: { span: 24 },
          rules: [{ required: true, message: "请输入收款账号" }],
        },
      },
      qrCode: {
        title: "收款二维码",
        type: "cropper-uploader",
        form: {
          col: { span: 24 },
          component: {
            vModel: "modelValue",
            valueType: "key",
            cropper: {
              aspectRatio: 1,
              autoCropArea: 1,
              viewMode: 0,
            },
            onReady: null,
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
              return `/api/basic/file/download?key=` + key;
            },
          },
        },
      },
      bankName: {
        title: "开户银行",
        type: "text",
        form: {
          col: { span: 24 },
          show: compute(({ form }) => form.channel === "bank"),
          rules: [{ required: compute(({ form }) => form.channel === "bank"), message: "请输入开户银行" }],
        },
      },
    },
    async onSubmit(form: any) {
      await api.SaveWithdrawSetting(form);
      notification.success({ message: "保存成功" });
    },
  });
}

async function applyWithdraw() {
  await api.ApplyWithdraw(util.amount.toCent(withdrawAmountYuan.value || 0));
  withdrawAmountYuan.value = 0;
  await loadWalletSummary();
  await Promise.all([withdrawCrudExpose.doRefresh(), logsCrudExpose.doRefresh()]);
  notification.success({ message: "提现申请已提交" });
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

onMounted(refreshWalletPage);

onActivated(async () => {
  if (!loaded.value) {
    return;
  }
  await refreshWalletPage();
});
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

  .wallet-summary-grid,
  .wallet-action-panel {
    flex: none;
  }

  .wallet-summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 18px;
  }

  .summary-card,
  .wallet-action-panel,
  .wallet-tabs {
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

  .wallet-action-panel {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 16px;
    padding: 14px 18px;
    margin-bottom: 18px;
  }

  .wallet-action-title {
    flex: none;
    color: hsl(var(--foreground));
    font-size: 15px;
    font-weight: 600;
  }

  .wallet-action-content {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-start;
    gap: 10px;
  }

  .withdraw-amount-input {
    width: 240px;
  }

  .wallet-tabs {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    padding: 0 12px 12px;
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

    .wallet-action-panel {
      align-items: stretch;
      flex-direction: column;
    }

    .wallet-action-content {
      justify-content: flex-start;
    }

    .withdraw-amount-input {
      width: 100%;
    }
  }
}
</style>
