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

const { t } = useI18n();
const { openFormDialog } = useFormDialog();

const userStore = useUserStore();
const changePasswordButtonRef = ref();
const emailFormWrapperRef = ref<any>();

const validateEmailConfirm = async (_rule: any, value: string) => {
  if (!value) {
    return;
  }
  const formData = emailFormWrapperRef.value?.getFormData?.();
  if (formData && value !== formData.email) {
    throw new Error("两次输入的邮箱地址不一致");
  }
};

async function checkAndSetupAccount() {
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
      title: "绑定邮箱",
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
          message: "邮箱绑定成功",
        });
      },
      body: () => {
        return <a-alert class="mb-4" message="为保证用户体验，请先绑定邮箱，初始化您的账号" type="success" show-icon></a-alert>;
      },
      columns: {
        email: {
          title: "邮箱",
          type: "text",
          form: {
            col: { span: 24 },
            component: {
              placeholder: "请输入邮箱地址",
            },
            helper: "请输入您的邮箱",
            rules: [
              { required: true, message: "请输入邮箱地址" },
              { type: "email", message: "请输入有效的邮箱地址" },
            ],
          },
        },
        emailConfirm: {
          title: "确认邮箱",
          type: "text",
          form: {
            col: { span: 24 },
            component: {
              placeholder: "请再次输入邮箱地址",
            },
            helper: "请再次输入邮箱，以确认邮箱地址无误",
            rules: [
              { required: true, message: "请再次输入邮箱地址" },
              { type: "email", message: "请输入有效的邮箱地址" },
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
