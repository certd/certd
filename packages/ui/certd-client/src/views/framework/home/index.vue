<template>
  <fs-page class="home—index bg-neutral-100 dark:bg-black">
    <!--    <page-content />-->
    <dashboard-user />
    <change-password-button ref="changePasswordButtonRef" :show-button="false" @close="checkAndSetupAccount"></change-password-button>
  </fs-page>
</template>

<script lang="tsx" setup>
import DashboardUser from "./dashboard/index.vue";
import { useUserStore } from "/@/store/user";
import ChangePasswordButton from "/@/views/certd/mine/change-password-button.vue";
import { onMounted, ref } from "vue";
import { Modal, notification } from "ant-design-vue";
import { useI18n } from "/src/locales";
import { request } from "/@/api/service";
import { useFormDialog } from "/@/use/use-dialog";
import { useSettingStore } from "/@/store/settings/index.jsx";

const { t } = useI18n();
const { openFormDialog } = useFormDialog();

const userStore = useUserStore();
const settingStore = useSettingStore();

const changePasswordButtonRef = ref();
const emailFormWrapperRef = ref<any>();

const validateEmailConfirm = async (_rule: any, value: string) => {
  if (!value) {
    return;
  }
  const formData = emailFormWrapperRef.value?.getFormData?.();
  if (formData && value !== formData.email) {
    throw new Error(t("certd.accountInit.emailMismatch"));
  }
};

async function checkAndSetupAccount() {
  if (settingStore.isEnterprise) {
    return;
  }
  try {
    const userInfo = userStore.getUserInfo as any;
    if (!userInfo.needInitAccount) {
      return;
    }

    if (userInfo.email) {
      await request({
        url: "/mine/accountInit",
        method: "post",
      });
      return;
    }

    emailFormWrapperRef.value = await openFormDialog({
      title: t("certd.accountInit.title"),
      wrapper: {
        width: 560,
      },
      initialForm: { email: "", emailConfirm: "" },
      async onSubmit(form: any) {
        await request({
          url: "/mine/accountInit",
          method: "post",
          data: { email: form.email },
        });
        notification.success({
          message: t("certd.accountInit.success"),
        });
      },
      body: () => {
        return <a-alert class="mb-4" message={t("certd.accountInit.description")} type="success" show-icon></a-alert>;
      },
      columns: {
        email: {
          title: t("certd.accountInit.email"),
          type: "text",
          form: {
            col: { span: 24 },
            component: {
              placeholder: t("certd.accountInit.emailPlaceholder"),
            },
            helper: t("certd.accountInit.emailHelper"),
            rules: [
              { required: true, message: t("certd.accountInit.emailRequired") },
              { type: "email", message: t("certd.accountInit.emailInvalid") },
            ],
          },
        },
        emailConfirm: {
          title: t("certd.accountInit.emailConfirm"),
          type: "text",
          form: {
            col: { span: 24 },
            component: {
              placeholder: t("certd.accountInit.emailConfirmPlaceholder"),
            },
            helper: t("certd.accountInit.emailConfirmHelper"),
            rules: [
              { required: true, message: t("certd.accountInit.emailConfirmRequired") },
              { type: "email", message: t("certd.accountInit.emailInvalid") },
              { validator: validateEmailConfirm, trigger: "blur" },
            ],
          },
        },
      },
    });
  } catch (e) {
    console.error("AcmeAccount setup failed:", e);
  }
}

onMounted(() => {
  if (userStore.getUserInfo.isWeak === true) {
    Modal.info({
      title: t("authentication.title"),
      content: t("authentication.weakPasswordWarning"),
      onOk: () => {
        changePasswordButtonRef.value.open({
          password: "123456",
        });
      },
      okText: t("authentication.changeNow"),
    });
  } else {
    //两个弹框不要同时出现
    checkAndSetupAccount();
  }
});
</script>
<style lang="less">
.home—index {
}
</style>
