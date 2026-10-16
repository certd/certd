<template>
  <div class="sys-settings-form sys-settings-mode">
    <a-form :model="formState" name="basic" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }" autocomplete="off" @finish="onFinish">
      <a-form-item :label="t('certd.sys.settings.adminMode')" :name="['public', 'adminMode']">
        <div class="w-full flex items-center">
          <fs-dict-radio v-model:value="formState.public.adminMode" :disabled="!settingsStore.isPlus" :dict="adminModeDict" />
          <vip-button class="ml-5" mode="button"></vip-button>
        </div>
        <div class="helper">{{ t("certd.sys.settings.modeSaasHelper") }}</div>
        <div class="helper">{{ t("certd.sys.settings.modeEnterpriseHelper") }}</div>
        <div class="helper">
          <a @click="adminModeIntroOpen = true">{{ t("certd.sys.settings.modeMore") }}</a>
        </div>
        <div class="helper text-red-500">{{ t("certd.sys.settings.modeFixedWarning") }}</div>
        <div v-if="formState.public.adminMode === 'enterprise'" class="helper">
          {{ t("certd.sys.settings.modeMigrate") }}<a @click="goCurrentProject"> {{ t("certd.sys.settings.switchModeNow") }}</a>
        </div>
        <div v-if="settingsStore.isComm" class="helper text-red-500">{{ t("certd.sys.settings.modeCommWarning") }}</div>
      </a-form-item>

      <a-form-item label=" " :colon="false" :wrapper-col="{ span: 8 }">
        <a-button :loading="saveLoading" type="primary" html-type="submit">{{ t("certd.sys.settings.saveButton") }}</a-button>
      </a-form-item>
    </a-form>

    <AdminModeIntro v-model:open="adminModeIntroOpen" fixed></AdminModeIntro>
  </div>
</template>

<script setup lang="tsx">
import { reactive, ref } from "vue";
import { SysSettings } from "/@/views/sys/settings/api";
import * as api from "/@/views/sys/settings/api";
import { merge } from "lodash-es";
import { useSettingStore } from "/@/store/settings";
import { Modal, notification } from "ant-design-vue";
import { useI18n } from "/src/locales";
import { dict } from "@fast-crud/fast-crud";
import { useProjectStore } from "/@/store/project";
import AdminModeIntro from "/@/views/sys/enterprise/project/intro.vue";
import { useRouter } from "vue-router";
const { t } = useI18n();

defineOptions({
  name: "SettingMode",
});

const adminModeIntroOpen = ref(false);

const adminModeDict = dict({
  data: [
    {
      label: t("certd.sys.settings.saasMode"),
      value: "saas",
    },
    {
      label: t("certd.sys.settings.enterpriseMode"),
      value: "enterprise",
    },
  ],
});

const formState = reactive<Partial<SysSettings>>({
  public: {},
  private: {},
});

async function loadSysSettings() {
  const data: any = await api.SysSettingsGet();
  merge(formState, data);
}

const saveLoading = ref(false);
loadSysSettings();
const settingsStore = useSettingStore();
const projectStore = useProjectStore();
const onFinish = async (form: any) => {
  try {
    saveLoading.value = true;

    await api.SysSettingsSave(form);
    await settingsStore.loadSysSettings();
    await projectStore.reload();
    notification.success({
      message: t("certd.common.saveSuccess"),
    });

    if (formState.public.adminMode === "enterprise") {
      Modal.confirm({
        title: "数据迁移",
        okText: "去迁移",
        content: () => {
          return (
            <div>
              <div>设置为企业模式之后，之前创建的个人数据不会显示</div>
              <div>是否前往迁移数据到项目? </div>
            </div>
          );
        },
        onOk: () => {
          goCurrentProject();
        },
      });
    }
  } finally {
    saveLoading.value = false;
  }
};

const router = useRouter();
const goCurrentProject = () => {
  router.push({
    path: "/cert/project/detail",
    query: {
      migrate: "true",
    },
  });
};
</script>
<style lang="less"></style>
