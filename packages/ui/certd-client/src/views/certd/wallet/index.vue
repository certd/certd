<template>
  <fs-page class="page-wallet">
    <template #header>
      <div class="title">我的钱包</div>
    </template>
    <div class="wallet-body">
      <a-row :gutter="16" class="wallet-summary">
        <a-col :span="6">
          <a-statistic title="可用余额" :value="amountToYuan(summary.availableAmount)" suffix="元" />
        </a-col>
        <a-col :span="6">
          <a-statistic title="冻结余额" :value="amountToYuan(summary.frozenAmount)" suffix="元" />
        </a-col>
        <a-col :span="6">
          <a-statistic title="累计收入" :value="amountToYuan(summary.totalIncomeAmount)" suffix="元" />
        </a-col>
        <a-col :span="6">
          <a-statistic title="累计提现" :value="amountToYuan(summary.totalWithdrawAmount)" suffix="元" />
        </a-col>
      </a-row>

      <div class="wallet-actions">
        <a-space>
          <a-button type="primary" @click="openWithdrawSetting">提现设置</a-button>
          <a-input-number v-model:value="withdrawAmountYuan" :min="0" addon-before="提现金额" addon-after="元" />
          <a-button @click="applyWithdraw">申请提现</a-button>
        </a-space>
      </div>

      <fs-crud ref="withdrawCrudRef" class="wallet-crud" v-bind="withdrawCrudBinding" />
    </div>
  </fs-page>
</template>

<script lang="ts" setup>
import { onActivated, onMounted, reactive, ref } from "vue";
import { compute, dict, useFs } from "@fast-crud/fast-crud";
import { notification } from "ant-design-vue";
import * as api from "./api";
import createWithdrawCrudOptions from "./crud-withdraw";
import { util } from "/@/utils";
import { useFormDialog } from "/@/use/use-dialog";

defineOptions({ name: "MyWallet" });

const summary = reactive<any>({ availableAmount: 0, frozenAmount: 0, totalIncomeAmount: 0, totalWithdrawAmount: 0 });
const withdrawAmountYuan = ref(0);
const loaded = ref(false);
const { openFormDialog } = useFormDialog();
const { crudBinding: withdrawCrudBinding, crudExpose: withdrawCrudExpose, crudRef: withdrawCrudRef } = useFs({ createCrudOptions: createWithdrawCrudOptions });

function amountToYuan(amount: number) {
  return util.amount.toYuan(amount || 0);
}

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
  await withdrawCrudExpose.doRefresh();
  notification.success({ message: "提现申请已提交" });
}

async function refreshWalletPage() {
  await loadWalletSummary();
  await withdrawCrudExpose.doRefresh();
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
  }

  .wallet-summary,
  .wallet-actions {
    flex: none;
  }

  .wallet-actions {
    margin: 16px 0 10px;
  }

  .wallet-crud {
    flex: 1;
    min-height: 0;
  }
}
</style>
