<template>
  <fs-page class="page-user-profile">
    <template #header>
      <div class="title">我的信息</div>
    </template>
    <div class="p-10">
      <a-descriptions title="" bordered>
        <a-descriptions-item label="用户名">{{ userInfo.userInfoname }}</a-descriptions-item>
        <a-descriptions-item label="昵称">{{ userInfo.nickName }}</a-descriptions-item>
        <a-descriptions-item label="邮箱">{{ userInfo.email }}</a-descriptions-item>
        <a-descriptions-item label="手机号">{{ userInfo.phoneCode }}{{ userInfo.mobile }}</a-descriptions-item>
        <a-descriptions-item label="修改密码">
          <a-button type="primary" @click="changePassword">修改密码</a-button>
        </a-descriptions-item>
      </a-descriptions>
    </div>
  </fs-page>
</template>

<script lang="ts" setup>
import * as api from "./api";
import { Ref, ref } from "vue";
import { CrudOptions, useColumns, useFormWrapper } from "@fast-crud/fast-crud";
import { notification } from "ant-design-vue";

const userInfo: Ref = ref({});

const getUserInfo = async () => {
  userInfo.value = await api.getMineInfo();
};
getUserInfo();

let passwordFormRef = ref();

const validatePass1 = async (rule: any, value: any) => {
  if (value === "") {
    throw new Error("请输入密码");
  }
  if (passwordFormRef.value.getFormData().confirmNewPassword !== "") {
    passwordFormRef.value.formRef.formRef.validateFields(["confirmNewPassword"]);
  }
};
const validatePass2 = async (rule: any, value: any) => {
  if (value === "") {
    throw new Error("请再次输入密码");
  } else if (value !== passwordFormRef.value.getFormData().newPassword) {
    throw new Error("两次输入密码不一致!");
  }
};
const { openDialog } = useFormWrapper();
const { buildFormOptions } = useColumns();
const passwordFormOptions: CrudOptions = {
  form: {
    col: {
      span: 24
    },
    wrapper: {
      title: "修改密码",
      width: "500px"
    },
    async doSubmit({ form }) {
      await api.changePassword(form);
    },
    async afterSubmit() {
      notification.success({ message: "修改成功" });
    }
  },
  columns: {
    password: {
      title: "旧密码",
      type: "password",
      form: {
        rules: [{ required: true, message: "请输入旧密码" }]
      }
    },
    newPassword: {
      title: "新密码",
      type: "password",
      form: {
        rules: [
          { required: true, message: "请输入确认密码" },
          //@ts-ignore
          { validator: validatePass1, trigger: "blur" }
        ]
      }
    },
    confirmNewPassword: {
      title: "确认新密码",
      type: "password",
      form: {
        rules: [
          { required: true, message: "请输入确认密码" },
          //@ts-ignore
          { validator: validatePass2, trigger: "blur" }
        ]
      }
    }
  }
};

async function changePassword() {
  const formOptions = buildFormOptions(passwordFormOptions);
  formOptions.newInstance = true; //新实例打开
  passwordFormRef.value = await openDialog(formOptions);
  console.log(passwordFormRef.value);
}
</script>
