<template>
  <div class="sys-settings-form sys-settings-register">
    <a-form :model="formState" name="register" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }" autocomplete="off" @finish="onFinish">
      <a-form-item :label="t('certd.sys.settings.registerMode')" :name="['public', 'registerMode']">
        <a-select v-model:value="formState.public.registerMode" :options="registerModeOptions" class="register-mode-select" />
        <div class="helper">{{ t("certd.sys.settings.registerModeHelper") }}</div>
        <div v-if="!settingsStore.isComm" class="color-red helper">{{ t("certd.sys.settings.selfRegistrationWarning") }}</div>
      </a-form-item>
      <a-form-item :label="t('certd.sys.settings.enableCommonSelfServicePasswordRetrieval')" :name="['public', 'selfServicePasswordRetrievalEnabled']">
        <a-switch v-model:checked="formState.public.selfServicePasswordRetrievalEnabled" />
      </a-form-item>
      <a-form-item :label="t('certd.sys.settings.enableUserValidityPeriod')" :name="['public', 'userValidTimeEnabled']">
        <div class="flex-o">
          <a-switch v-model:checked="formState.public.userValidTimeEnabled" :disabled="!settingsStore.isPlus" />
          <vip-button class="ml-5" mode="button"></vip-button>
        </div>
        <div class="helper">
          {{ t("certd.sys.settings.userValidityPeriodHelper") }}
          <a href="https://certd.docmirror.cn/guide/use/setting/user-valid.html" target="_blank">{{ t("certd.common.helpDocLink") }}</a>
        </div>
      </a-form-item>
      <template v-if="formState.public.registerMode !== 'closed'">
        <a-form-item :label="t('certd.sys.settings.enableUsernameRegistration')" :name="['public', 'usernameRegisterEnabled']">
          <a-switch v-model:checked="formState.public.usernameRegisterEnabled" />
        </a-form-item>

        <a-form-item :label="t('certd.sys.settings.enableEmailRegistration')" :name="['public', 'emailRegisterEnabled']">
          <div class="flex-o">
            <a-switch v-model:checked="formState.public.emailRegisterEnabled" :disabled="!settingsStore.isPlus" :title="t('certd.sys.settings.proFeature')" />
            <vip-button class="ml-5" mode="button"></vip-button>
          </div>
          <div class="helper">
            <router-link to="/sys/settings/email">{{ t("certd.sys.settings.emailServerSetup") }}</router-link>
          </div>
        </a-form-item>
        <a-form-item :label="t('certd.sys.settings.defaultLoginType')" :name="['public', 'defaultLoginType']" required>
          <div class="flex-o">
            <a-radio-group v-model:value="formState.public.defaultLoginType" :options="loginTypeOptions" :title="t('certd.sys.settings.commFeature')" />
          </div>
        </a-form-item>
        <a-form-item :label="t('certd.sys.settings.enableSmsLoginRegister')" :name="['public', 'smsLoginEnabled']">
          <div class="flex-o">
            <a-switch v-model:checked="formState.public.smsLoginEnabled" :disabled="!settingsStore.isComm" :title="t('certd.sys.settings.commFeature')" />
            <vip-button class="ml-5" mode="comm"></vip-button>
          </div>
        </a-form-item>
        <template v-if="formState.public.smsLoginEnabled">
          <a-form-item :label="t('certd.sys.settings.smsProvider')" :name="['private', 'sms', 'type']">
            <a-select v-model:value="formState.private.sms.type" @change="smsTypeChange">
              <a-select-option value="aliyun">{{ t("certd.sys.settings.aliyunSms") }}</a-select-option>
              <a-select-option value="tencent">{{ t("certd.sys.settings.tencentSms") }}</a-select-option>
              <a-select-option value="yfysms">{{ t("certd.sys.settings.yfySms") }}</a-select-option>
            </a-select>
          </a-form-item>
          <template v-for="item of smsTypeDefineInputs" :key="item.simpleKey">
            <fs-form-item v-model="formState.private.sms.config[item.simpleKey]" :path="'private.sms.config' + item.key" :item="item" />
          </template>

          <a-form-item :label="t('certd.sys.settings.smsTest')">
            <div class="flex">
              <a-input v-model:value="testMobile" :placeholder="t('certd.sys.settings.testMobilePlaceholder')" />
              <loading-button class="ml-5" :title="t('certd.sys.settings.saveThenTest')" type="primary" :click="testSendSms">{{ t("certd.common.testButton") }}</loading-button>
            </div>
            <div class="helper">{{ t("certd.sys.settings.saveThenTest") }}</div>
          </a-form-item>
        </template>
      </template>
      <template v-if="formState.public.registerMode === 'invite'">
        <a-form-item :label="t('certd.sys.settings.inviteLinks')">
          <div class="invite-block">
            <a-button type="primary" @click="openInviteModal">{{ t("certd.sys.settings.inviteGenerate") }}</a-button>
            <div class="helper">{{ t("certd.sys.settings.inviteLinksHelper") }}</div>
            <a-table class="mt-3" size="small" row-key="id" :columns="inviteColumns" :data-source="invites" :pagination="false">
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'createTime'">{{ formatDate(record.createTime) }}</template>
                <template v-else-if="column.key === 'expiresTime'">{{ formatTime(record.expiresTime) }}</template>
                <template v-else-if="column.key === 'status'">
                  {{ record.status === "used" ? t("certd.sys.settings.inviteStatusUsed") : t("certd.sys.settings.inviteStatusActive") }}
                </template>
                <template v-else-if="column.key === 'action'">
                  <a-button type="link" size="small" @click="openRemark(record)">{{ t("certd.sys.settings.inviteEditRemark") }}</a-button>
                  <a-button type="link" size="small" danger @click="disableInvite(record)">{{ t("certd.sys.settings.inviteDisable") }}</a-button>
                </template>
              </template>
            </a-table>
          </div>
        </a-form-item>
      </template>
      <a-form-item label=" " :colon="false" :wrapper-col="{ span: 16 }">
        <a-button :loading="saveLoading" type="primary" html-type="submit">{{ t("certd.sys.settings.saveButton") }}</a-button>
      </a-form-item>
    </a-form>
    <a-modal
      v-model:open="inviteModalOpen"
      :title="t('certd.sys.settings.inviteGenerate')"
      :confirm-loading="inviteCreating"
      :ok-text="createdLink ? t('certd.common.copy') : t('certd.common.confirm')"
      :cancel-text="t('certd.common.cancel')"
      :cancel-button-props="createdLink ? { style: { display: 'none' } } : {}"
      @ok="onInviteModalOk"
    >
      <a-form layout="vertical">
        <a-form-item :label="t('certd.sys.settings.inviteExpiresDays')">
          <a-input-number v-model:value="inviteDays" :min="1" :max="30" class="invite-days" />
        </a-form-item>
        <a-form-item :label="t('certd.sys.settings.inviteRemark')">
          <a-input v-model:value="inviteRemark" />
        </a-form-item>
      </a-form>
      <div v-if="createdLink" class="created-link mt-3">
        <a-input :value="createdLink" readonly />
        <div class="helper warning">{{ t("certd.sys.settings.inviteLinkOnce") }}</div>
      </div>
    </a-modal>
    <a-modal v-model:open="remarkModalOpen" :title="t('certd.sys.settings.inviteEditRemark')" :confirm-loading="remarkSaving" :ok-text="t('certd.common.confirm')" :cancel-text="t('certd.common.cancel')" @ok="saveRemark">
      <a-form layout="vertical">
        <a-form-item :label="t('certd.sys.settings.inviteRemark')">
          <a-input v-model:value="remarkEditingValue" :maxlength="255" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="tsx">
import { Modal, notification } from "ant-design-vue";
import { merge } from "lodash-es";
import { computed, reactive, ref, Ref } from "vue";
import { useSettingStore } from "/@/store/settings";
import * as api from "/@/views/sys/settings/api";
import { SysSettings } from "/@/views/sys/settings/api";
import { useI18n } from "/src/locales";
const { t } = useI18n();

const registerModeOptions = computed(() => [
  { label: t("certd.sys.settings.registerModeClosed"), value: "closed" },
  { label: t("certd.sys.settings.registerModeInvite"), value: "invite" },
  { label: t("certd.sys.settings.registerModeOpen"), value: "open" },
]);

const invites = ref<any[]>([]);
const inviteModalOpen = ref(false);
const inviteCreating = ref(false);
const inviteDays = ref(3);
const inviteRemark = ref("");
const createdLink = ref("");

function formatTime(value: any) {
  if (value == null || value === "") {
    return "";
  }
  return new Date(Number(value)).toLocaleString();
}

function formatDate(value: any) {
  if (!value) {
    return "";
  }
  return new Date(value).toLocaleString();
}

const remarkModalOpen = ref(false);
const remarkSaving = ref(false);
const remarkEditingId = ref<number | null>(null);
const remarkEditingValue = ref("");

function openRemark(record: any) {
  remarkEditingId.value = record.id;
  remarkEditingValue.value = record.remark || "";
  remarkModalOpen.value = true;
}

async function saveRemark() {
  if (remarkEditingId.value == null) {
    return;
  }
  remarkSaving.value = true;
  try {
    await api.RegisterInviteUpdateRemark({ id: remarkEditingId.value, remark: remarkEditingValue.value });
    remarkModalOpen.value = false;
    await loadInvites();
    notification.success({ message: t("certd.sys.settings.inviteRemarkUpdated") });
  } finally {
    remarkSaving.value = false;
  }
}

function disableInvite(record: any) {
  Modal.confirm({
    title: t("certd.sys.settings.inviteDisable"),
    content: t("certd.sys.settings.inviteDisableConfirm"),
    okText: t("certd.common.confirm"),
    cancelText: t("certd.common.cancel"),
    okButtonProps: { danger: true },
    async onOk() {
      await api.RegisterInviteDisable(record.id);
      notification.success({ message: t("certd.sys.settings.inviteDisabled") });
      await loadInvites();
    },
  });
}

const inviteColumns = computed(() => [
  { title: t("certd.sys.settings.inviteCreateTime"), dataIndex: "createTime", key: "createTime" },
  { title: t("certd.sys.settings.inviteExpiresTime"), dataIndex: "expiresTime", key: "expiresTime" },
  { title: t("certd.sys.settings.inviteStatus"), dataIndex: "status", key: "status" },
  { title: t("certd.sys.settings.inviteRemark"), dataIndex: "remark", key: "remark" },
  { title: t("certd.sys.settings.inviteUsedUser"), dataIndex: "usedUserName", key: "usedUserName" },
  { title: t("certd.sys.settings.inviteActions"), key: "action" },
]);

async function loadInvites() {
  try {
    invites.value = (await api.RegisterInviteList()) || [];
  } catch {
    invites.value = [];
  }
}

function openInviteModal() {
  inviteModalOpen.value = true;
  inviteDays.value = 3;
  inviteRemark.value = "";
  createdLink.value = "";
}

async function createInvite() {
  inviteCreating.value = true;
  try {
    // 生成邀请前先落库“受邀注册”，避免设置未保存导致链接与当前注册模式不一致
    formState.public.registerMode = "invite";
    await api.SysSettingsSave({ public: { ...formState.public, registerEnabled: false }, private: formState.private } as any);
    await settingsStore.loadSysSettings();
    const res: any = await api.RegisterInviteCreate({ expiresDays: inviteDays.value, remark: inviteRemark.value });
    if (res?.token) {
      const base = `${window.location.origin}${window.location.pathname}`;
      createdLink.value = `${base}#/register?inviteToken=${encodeURIComponent(res.token)}`;
    }
    await loadInvites();
    notification.success({ message: t("certd.sys.settings.inviteCreated") });
  } finally {
    inviteCreating.value = false;
  }
}

async function onInviteModalOk() {
  if (createdLink.value) {
    await copyLink();
    return;
  }
  await createInvite();
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(createdLink.value);
    notification.success({ message: t("certd.common.copySuccess") });
  } catch {
    notification.error({ message: t("certd.common.copyFailed") });
  }
}

defineOptions({
  name: "SettingRegister",
});

const testMobile = ref("");
async function testSendSms() {
  if (!testMobile.value) {
    notification.error({
      message: t("certd.sys.settings.enterTestMobile"),
    });
    return;
  }
  await api.TestSms({
    mobile: testMobile.value,
  });
  notification.success({
    message: t("certd.sys.settings.sendSuccess"),
  });
}

const formState = reactive<Partial<SysSettings>>({
  public: {
    registerEnabled: false,
    registerMode: "closed",
  },
  private: {
    sms: {
      type: "aliyun",
      config: {},
    },
  },
});

const rules = {
  leastOneLogin: {
    validator: (rule: any, value: any) => {
      if (!formState.public.passwordLoginEnabled && !formState.public.smsLoginEnabled) {
        return Promise.reject(t("certd.sys.settings.atLeastOneLoginRequired"));
      }
      return Promise.resolve();
    },
  },
  required: {
    required: true,
    trigger: "change",
    message: t("certd.common.fieldRequired"),
  },
};

async function smsTypeChange(value: string) {
  if (formState.private?.sms?.config) {
    formState.private.sms.config = {};
  }

  await loadTypeDefine(value);
}
const smsTypeDefineInputs: Ref = ref({});
async function loadTypeDefine(type: string) {
  const define: any = await api.GetSmsTypeDefine(type);
  const keys = Object.keys(define.input);
  const inputs: any = {};
  keys.forEach(key => {
    const value = define.input[key];
    value.simpleKey = key;
    value.key = "private.sms.config." + key;
    if (!value.component) {
      value.component = {
        name: "a-input",
      };
    }
    if (!value.component.name) {
      value.component.vModel = "value";
    }
    if (!value.rules) {
      value.rules = [];
    }
    if (value.required) {
      value.rules.push(rules.required);
    }

    inputs[key] = define.input[key];
  });
  smsTypeDefineInputs.value = inputs;
}

async function loadSysSettings() {
  const data: any = await api.SysSettingsGet();
  merge(formState, data);
  // 兼容旧数据：无 registerMode 时按 registerEnabled 派生
  formState.public.registerMode = data?.public?.registerMode ?? (data?.public?.registerEnabled ? "open" : "closed");
  if (formState.public.registerMode === "invite") {
    await loadInvites();
  }
  if (data?.private.sms?.type) {
    await loadTypeDefine(data.private.sms.type);
  }
  if (!settingsStore.isPlus) {
    formState.public.userValidTimeEnabled = false;
    formState.public.emailRegisterEnabled = false;
  }

  if (!settingsStore.isComm) {
    formState.public.smsLoginEnabled = false;
  }
}

const saveLoading = ref(false);
loadSysSettings();
const settingsStore = useSettingStore();
const onFinish = async (form: any) => {
  try {
    saveLoading.value = true;
    // 保持 registerEnabled 与模式一致：仅开放注册为 true，保持旧字段语义
    if (form?.public) {
      form.public.registerEnabled = form.public.registerMode === "open";
    }
    await api.SysSettingsSave(form);
    await settingsStore.loadSysSettings();
    if (form?.public?.registerMode === "invite") {
      await loadInvites();
    }
    notification.success({
      message: t("certd.common.saveSuccess"),
    });
  } finally {
    saveLoading.value = false;
  }
};

const loginTypeOptions = computed(() => [
  {
    label: t("certd.auth.loginType.password"),
    value: "password",
  },
  {
    label: t("certd.auth.loginType.sms"),
    value: "sms",
    disabled: !formState.public.smsLoginEnabled,
  },
]);
</script>
<style lang="less">
.sys-settings-register {
  width: 1000px !important;

  .register-mode-select {
    width: 220px;
  }
  .invite-block {
    width: 100%;
  }
  .invite-days {
    width: 160px;
  }
  .created-link {
    display: flex;
    align-items: center;
  }

  .register-warning {
    color: #fa8c16;
  }

  .addon-selector {
    .inner {
      justify-content: space-between;
    }
  }
}
</style>
