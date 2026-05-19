<template>
  <fs-page class="page-sys-invite-setting">
    <template #header>
      <div class="title">激励计划设置</div>
    </template>
    <div class="page-body">
      <a-form ref="formRef" :model="settings" :label-col="{ style: { width: '140px' } }" class="settings-form">
        <a-form-item label="开启激励计划" name="enabled">
          <a-switch v-model:checked="settings.enabled" />
        </a-form-item>
        <a-form-item label="推广协议" name="agreementContent">
          <a-textarea v-model:value="settings.agreementContent" :rows="10" placeholder="请输入用户开通激励计划前需要确认的推广协议内容" />
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

const defaultAgreement = "请遵守平台推广规则，不得通过虚假注册、刷单、恶意诱导等方式获取收益。平台有权对异常推广行为进行核查，并根据实际情况暂停结算或关闭激励计划资格。";
const settings = reactive<any>({ enabled: false, agreementContent: "", minWithdrawAmountYuan: 0, withdrawChannels: ["alipay", "bank"] });
const withdrawChannelOptions = [
  { label: "支付宝", value: "alipay" },
  { label: "银行卡", value: "bank" },
];

async function loadSettings() {
  const data: any = await api.GetSettings();
  settings.enabled = !!data?.enabled;
  settings.agreementContent = data?.agreementContent || defaultAgreement;
  settings.minWithdrawAmountYuan = util.amount.toYuan(data?.minWithdrawAmount || 0);
  settings.withdrawChannels = data?.withdrawChannels?.length ? data.withdrawChannels : ["alipay", "bank"];
}

async function saveSettings() {
  await api.SaveSettings({
    enabled: settings.enabled,
    agreementContent: settings.agreementContent || "",
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
    max-width: 860px;
  }
}
</style>
