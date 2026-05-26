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
        <a-form-item label="最低提现金额" name="minWithdrawAmountYuan">
          <a-input-number v-model:value="settings.minWithdrawAmountYuan" :min="0" addon-after="元" />
        </a-form-item>
        <a-form-item label="提现渠道" name="withdrawChannels">
          <a-checkbox-group v-model:value="settings.withdrawChannels" :options="withdrawChannelOptions" />
        </a-form-item>
        <a-form-item v-if="bankChannelEnabled" label="开户银行" name="withdrawBanks">
          <a-select v-model:value="settings.withdrawBanks" mode="tags" :options="bankOptions" placeholder="请选择或输入支持的开户银行" :token-separators="['，', ',', '、']" />
        </a-form-item>
        <a-form-item label="推广协议" name="agreementContent">
          <fs-editor-wang5
            v-model="settings.agreementContent"
            :toolbar-config="{}"
            :editor-config="{ placeholder: '请输入用户开通激励计划前需要确认的推广协议内容' }"
            :uploader="editorUploader"
            :container="{ class: 'agreement-editor' }"
            style="height: 400px"
          />
        </a-form-item>
        <a-form-item label=" " :colon="false">
          <a-button type="primary" @click="saveSettings">保存设置</a-button>
        </a-form-item>
      </a-form>
    </div>
  </fs-page>
</template>

<script lang="ts" setup>
import { computed, onMounted, reactive } from "vue";
import { notification } from "ant-design-vue";
import * as api from "./api";
import { util } from "/@/utils";
import { useSettingStore } from "/@/store/settings";
import { useUserStore } from "/@/store/user";

defineOptions({ name: "SysInviteCommissionSetting" });

const defaultAgreement = "<p>请遵守平台推广规则，不得通过虚假注册、刷单、恶意诱导等方式获取收益。平台有权对异常推广行为进行核查，并根据实际情况暂停结算或关闭激励计划资格。</p>";
const defaultWithdrawBanks = [
  "中国工商银行",
  "中国农业银行",
  "中国银行",
  "中国建设银行",
  "交通银行",
  "招商银行",
  "中国邮政储蓄银行",
  "中信银行",
  "中国光大银行",
  "华夏银行",
  "中国民生银行",
  "广发银行",
  "平安银行",
  "兴业银行",
  "浦发银行",
];
const settings = reactive<any>({ enabled: false, agreementContent: "", minWithdrawAmountYuan: 0, withdrawChannels: ["alipay", "bank"], withdrawBanks: defaultWithdrawBanks });
const withdrawChannelOptions = [
  { label: "支付宝", value: "alipay" },
  { label: "银行卡", value: "bank" },
];
const bankOptions = computed(() => defaultWithdrawBanks.map(item => ({ label: item, value: item })));
const bankChannelEnabled = computed(() => settings.withdrawChannels?.includes("bank"));
const userStore = useUserStore();
const editorUploader = {
  type: "form",
  action: "/basic/file/upload?autoSave=true&token=" + userStore.getToken,
  name: "file",
  headers: {
    Authorization: "Bearer " + userStore.getToken,
  },
  successHandle(res: any) {
    return res;
  },
  buildUrl(res: any) {
    return res.url || `/api/basic/file/download?key=${encodeURIComponent(res.key)}`;
  },
};

async function loadSettings() {
  const data: any = await api.GetSettings();
  settings.enabled = !!data?.enabled;
  settings.agreementContent = data?.agreementContent || defaultAgreement;
  settings.minWithdrawAmountYuan = util.amount.toYuan(data?.minWithdrawAmount || 0);
  settings.withdrawChannels = data?.withdrawChannels?.length ? data.withdrawChannels : ["alipay", "bank"];
  settings.withdrawBanks = data?.withdrawBanks?.length ? data.withdrawBanks : defaultWithdrawBanks;
}

async function saveSettings() {
  const withdrawBanks = bankChannelEnabled.value ? (settings.withdrawBanks || []).map((item: string) => item?.trim()).filter(Boolean) : [];
  if (isBlankAgreement(settings.agreementContent)) {
    notification.warning({ message: "请填写推广协议内容" });
    return;
  }
  await api.SaveSettings({
    enabled: settings.enabled,
    agreementContent: settings.agreementContent || "",
    minWithdrawAmount: util.amount.toCent(settings.minWithdrawAmountYuan || 0),
    withdrawChannels: settings.withdrawChannels || [],
    withdrawBanks,
  });
  await useSettingStore().loadSysSettings();
  notification.success({ message: "保存成功" });
}

function isBlankAgreement(content: string) {
  const text = `${content || ""}`
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, "")
    .trim();
  return !text;
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
  .agreement-editor {
    min-height: 420px;
  }
}
</style>
