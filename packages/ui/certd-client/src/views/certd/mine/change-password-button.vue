<template>
  <a-button v-if="showButton" type="primary" @click="open">
    {{ t("certd.auth.changePasswordButton") }}
  </a-button>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "/src/locales";

const { t } = useI18n();
import { compute, CrudOptions, useColumns, useFormWrapper } from "@fast-crud/fast-crud";
import * as api from "/@/views/certd/mine/api";
import { notification } from "ant-design-vue";
import { useUserStore } from "/@/store/user";

defineProps<{
  showButton: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

let passwordFormRef = ref();

type OpenOptions = {
  password?: string;
  init?: boolean;
};

const validatePass1 = async (rule: any, value: any) => {
  if (value === "") {
    throw new Error(t("certd.auth.enterPassword"));
  }
  const formData = passwordFormRef.value.getFormData();
  if (formData.confirmNewPassword !== "") {
    passwordFormRef.value.formRef.value.formRef.validateFields(["confirmNewPassword"]);
  }
  if (formData.password === formData.newPassword) {
    throw new Error(t("certd.auth.newPasswordNotSameOld"));
  }
};
const validatePass2 = async (rule: any, value: any) => {
  if (value === "") {
    throw new Error(t("certd.auth.enterPasswordAgain"));
  } else if (value !== passwordFormRef.value.getFormData().newPassword) {
    throw new Error(t("certd.auth.passwordsNotMatch"));
  }
};

const userStore = useUserStore();
const { openDialog } = useFormWrapper();
const { buildFormOptions } = useColumns();
const passwordFormOptions: CrudOptions = {
  form: {
    col: {
      span: 24,
    },
    wrapper: {
      title: t("certd.auth.title"),
      width: "500px",
    },
    async doSubmit({ form }) {
      if (form.init) {
        await api.initPassword(form);
      } else {
        await api.changePassword(form);
      }
      //重新加载用户信息
      await userStore.loadUserInfo();
    },
    async afterSubmit() {
      const formData = passwordFormRef.value?.getFormData?.();
      const msg = formData?.init ? t("certd.auth.initPasswordSuccessMessage") : t("certd.auth.successMessage");
      notification.success({ message: msg });
    },
  },
  columns: {
    init: {
      title: "init",
      type: "text",
      form: {
        show: false,
      },
    },
    password: {
      title: t("certd.auth.oldPassword"),
      type: "password",
      form: {
        //@ts-ignore
        show: compute(({ form }) => form.init !== true),
        rules: [{ required: true, message: t("certd.auth.oldPasswordRequired") }],
      },
    },
    newPassword: {
      title: t("certd.auth.newPassword"),
      type: "password",
      form: {
        rules: [
          { required: true, message: t("certd.auth.newPasswordRequired") },
          //@ts-ignore
          { validator: validatePass1, trigger: "blur" },
        ],
      },
    },
    confirmNewPassword: {
      title: t("certd.auth.confirmNewPassword"),
      type: "password",
      form: {
        rules: [
          {
            required: true,
            message: t("certd.auth.confirmNewPasswordRequired"),
          },
          //@ts-ignore
          { validator: validatePass2, trigger: "blur" },
        ],
      },
    },
  },
};

async function open(opts: OpenOptions = {}) {
  const formOptions = buildFormOptions(passwordFormOptions);
  formOptions.newInstance = true;
  if (opts.init) {
    formOptions.wrapper.title = t("certd.auth.initPasswordTitle");
  }
  formOptions.wrapper.onClosed = () => {
    emit("close");
  };
  passwordFormRef.value = await openDialog(formOptions);
  passwordFormRef.value.setFormData({
    init: opts.init === true,
    password: opts.password || "",
  });
}

const scope = ref({
  open: open,
});

defineExpose(scope.value);
</script>
