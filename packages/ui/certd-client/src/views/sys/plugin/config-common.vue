<template>
  <fs-page class="page-plugin-config">
    <template #header>
      <div class="title">{{ $t("certd.sys.plugin.certPluginConfig") }}</div>
    </template>

    <div class="sys-plugin-config settings-form">
      <a-form :model="formState" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }" autocomplete="off" @finish="onFinish" @finish-failed="onFinishFailed">
        <a-form-item v-show="false" label="公共Google EAB授权" :name="['CertApply', 'sysSetting', 'input', 'googleCommonEabAccessId']">
          <access-selector v-model:model-value="formState.CertApply.sysSetting.input.googleCommonEabAccessId" type="eab" from="sys"></access-selector>
          <div class="helper">
            <div>设置公共Google EAB授权给用户使用，避免用户自己去翻墙获取Google EAB授权</div>
            <div>
              <a href="https://certd.docmirror.cn/guide/use/google/">获取Google EAB授权方法 </a>
            </div>
          </div>
        </a-form-item>

        <a-form-item :label="$t('certd.sys.plugin.commonGoogleAcme')" :name="['CertApply', 'sysSetting', 'input', 'googleCommonAcmeAccountAccessId']">
          <access-selector v-model:model-value="formState.CertApply.sysSetting.input.googleCommonAcmeAccountAccessId" type="acmeAccount" subtype="google" from="sys"></access-selector>
          <div class="helper">
            <div>优先推荐配置公共ACME账号。配置后普通用户申请Google证书时无需选择账号，也不会重复消费公共EAB。</div>
          </div>
        </a-form-item>

        <a-form-item v-show="false" label="公共ZeroSSL EAB授权" :name="['CertApply', 'sysSetting', 'input', 'zerosslCommonEabAccessId']">
          <access-selector v-model:model-value="formState.CertApply.sysSetting.input.zerosslCommonEabAccessId" type="eab" from="sys"></access-selector>
          <div class="helper">
            <div>设置公共ZeroSSL EAB授权给用户使用，避免用户自己去翻墙获取Zero EAB授权</div>
            <div>
              <a href="https://app.zerossl.com/developer">zerossl开发者中心获取EAB </a>
            </div>
          </div>
        </a-form-item>

        <a-form-item :label="$t('certd.sys.plugin.commonZeroSslAcme')" :name="['CertApply', 'sysSetting', 'input', 'zerosslCommonAcmeAccountAccessId']">
          <access-selector v-model:model-value="formState.CertApply.sysSetting.input.zerosslCommonAcmeAccountAccessId" type="acmeAccount" subtype="zerossl" from="sys"></access-selector>
        </a-form-item>

        <a-form-item v-show="false" label="公共litessl EAB授权" :name="['CertApply', 'sysSetting', 'input', 'litesslCommonEabAccessId']">
          <access-selector v-model:model-value="formState.CertApply.sysSetting.input.litesslCommonEabAccessId" type="eab" from="sys"></access-selector>
          <div class="helper">
            <div>设置公共litessl EAB授权给用户使用，避免用户自己获取litessl EAB授权</div>
            <div>
              <a href="https://freessl.cn/automation/eab-manager">litessl EAB授权管理 </a>
            </div>
          </div>
        </a-form-item>

        <a-form-item :label="$t('certd.sys.plugin.commonLiteSslAcme')" :name="['CertApply', 'sysSetting', 'input', 'litesslCommonAcmeAccountAccessId']">
          <access-selector v-model:model-value="formState.CertApply.sysSetting.input.litesslCommonAcmeAccountAccessId" type="acmeAccount" subtype="litessl" from="sys"></access-selector>
        </a-form-item>

        <a-form-item :label="$t('certd.sys.plugin.otherConfig')">
          <a-button type="primary" @click="doPluginConfig">{{ $t("certd.sys.plugin.certApplyDefaults") }}</a-button>
          <div class="helper">
            <div>{{ $t("certd.sys.plugin.customCertApplyParams") }}</div>
          </div>
        </a-form-item>

        <a-form-item :wrapper-col="{ offset: 8, span: 16 }">
          <a-button :loading="saveLoading" type="primary" html-type="submit">{{ $t("certd.sys.plugin.save") }}</a-button>
        </a-form-item>
      </a-form>
    </div>
  </fs-page>
</template>

<script lang="ts" setup>
import AccessSelector from "/@/views/certd/access/access-selector/index.vue";
import { reactive, ref } from "vue";
import { CommPluginConfig, GetCommPluginConfigs, SaveCommPluginConfigs, getPluginSetting } from "/@/views/sys/plugin/api";
import { merge } from "lodash-es";
import { notification } from "ant-design-vue";
import { usePluginConfig } from "./use-config";
import { useI18n } from "vue-i18n";
defineOptions({
  name: "SysPluginConfig",
});
const { t } = useI18n();
const formState = reactive<Partial<CommPluginConfig>>({
  CertApply: {
    sysSetting: {
      input: {
        googleCommonEabAccessId: null,
      },
    },
  },
});

async function loadForm() {
  const res = await GetCommPluginConfigs();
  merge(formState, res);
}

loadForm();

const saveLoading = ref(false);
const onFinish = async (form: any) => {
  try {
    saveLoading.value = true;
    await SaveCommPluginConfigs(form);
    notification.success({
      message: t("certd.sys.plugin.saveSuccess"),
    });
  } finally {
    saveLoading.value = false;
  }
};

const onFinishFailed = (errorInfo: any) => {
  console.log("Failed:", errorInfo);
};

const { openConfigDialog } = usePluginConfig();

async function doPluginConfig() {
  const certApplyInfo: any = await getPluginSetting("CertApply");
  certApplyInfo.pluginType = "plugin";
  await openConfigDialog({
    row: certApplyInfo,
    onSuccess: async () => {
      await loadForm();
    },
  });
}
</script>
<style lang="less"></style>
