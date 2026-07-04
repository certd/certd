<template>
  <a-button v-if="showButton" type="primary" @click="open">
    {{ t("authentication.changePasswordButton") }}
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
    throw new Error(t("authentication.enterPassword"));
  }
  const formData = passwordFormRef.value.getFormData();
  if (formData.confirmNewPassword !== "") {
    passwordFormRef.value.formRef.formRef.validateFields(["confirmNewPassword"]);
  }
  if (formData.password === formData.newPassword) {
    throw new Error(t("authentication.newPasswordNotSameOld"));
  }
};
const validatePass2 = async (rule: any, value: any) => {
  if (value === "") {
    throw new Error(t("authentication.enterPasswordAgain"));
  } else if (value !== passwordFormRef.value.getFormData().newPassword) {
    throw new Error(t("authentication.passwordsNotMatch"));
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
      title: t("authentication.title"),
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
      const msg = formData?.init ? t("authentication.initPasswordSuccessMessage") : t("authentication.successMessage");
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
      title: t("authentication.oldPassword"),
      type: "password",
      form: {
        //@ts-ignore
        show: compute(({ form }) => form.init !== true),
        rules: [{ required: true, message: t("authentication.oldPasswordRequired") }],
      },
    },
    newPassword: {
      title: t("authentication.newPassword"),
      type: "password",
      form: {
        rules: [
          { required: true, message: t("authentication.newPasswordRequired") },
          //@ts-ignore
          { validator: validatePass1, trigger: "blur" },
        ],
      },
    },
    confirmNewPassword: {
      title: t("authentication.confirmNewPassword"),
      type: "password",
      form: {
        rules: [
          {
            required: true,
            message: t("authentication.confirmNewPasswordRequired"),
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
    formOptions.wrapper.title = t("authentication.initPasswordTitle");
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
