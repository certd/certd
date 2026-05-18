<template>
  <fs-page class="page-sys-invite-setting">
    <template #header>
      <div class="title">邀请返佣设置</div>
    </template>
    <div class="page-body">
      <a-form ref="formRef" :model="settings" :label-col="{ style: { width: '140px' } }" class="settings-form">
        <a-form-item label="开启返佣" name="enabled">
          <a-switch v-model:checked="settings.enabled" />
        </a-form-item>
        <a-form-item label="返佣比例" name="commissionRate">
          <a-input-number v-model:value="settings.commissionRate" :min="0" :max="100" addon-after="%" />
        </a-form-item>
        <a-form-item label="最低提现金额" name="minWithdrawAmountYuan">
          <a-input-number v-model:value="settings.minWithdrawAmountYuan" :min="0" addon-after="元" />
        </a-form-item>
        <a-form-item label="提现渠道" name="withdrawChannels">
          <a-checkbox-group v-model:value="settings.withdrawChannels" :options="withdrawChannelOptions" />
        </a-form-item>
        <a-form-item label=" ">
          <a-button type="primary" @click="saveSettings">保存设置</a-button>
        </a-form-item>
      </a-form>
    </div>
  </fs-page>
</template>

<script lang="ts" setup>
import { onMounted, reactive } from "vue";
import { notification } from "ant-design-vue";
import * as api from "./api";
import { util } from "/@/utils";
import { useSettingStore } from "/@/store/settings";

defineOptions({ name: "SysInviteCommissionSetting" });

const settings = reactive<any>({ enabled: false, commissionRate: 0, minWithdrawAmountYuan: 0, withdrawChannels: ["alipay", "bank"] });
const withdrawChannelOptions = [
  { label: "支付宝", value: "alipay" },
  { label: "银行卡", value: "bank" },
];

async function loadSettings() {
  const data: any = await api.GetSettings();
  settings.enabled = !!data?.enabled;
  settings.commissionRate = data?.commissionRate || 0;
  settings.minWithdrawAmountYuan = util.amount.toYuan(data?.minWithdrawAmount || 0);
  settings.withdrawChannels = data?.withdrawChannels?.length ? data.withdrawChannels : ["alipay", "bank"];
}

async function saveSettings() {
  await api.SaveSettings({
    enabled: settings.enabled,
    commissionRate: settings.commissionRate || 0,
    minWithdrawAmount: util.amount.toCent(settings.minWithdrawAmountYuan || 0),
    withdrawChannels: settings.withdrawChannels || [],
  });
  await useSettingStore().loadSysSettings();
  notification.success({ message: "保存成功" });
}

onMounted(loadSettings);
</script>

<style lang="less">
.page-sys-invite-setting {
  .page-body {
    padding: 20px;
  }
  .settings-form {
    max-width: 720px;
  }
}
</style>
