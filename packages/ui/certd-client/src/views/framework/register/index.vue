<template>
  <div class="main">
    <a-form
      ref="formRef"
      class="user-layout-register"
      name="custom-validation"
      :model="formState"
      :rules="rules"
      v-bind="layout"
      :label-col="{ span: 5 }"
      @finish="handleFinish"
      @finish-failed="handleFinishFailed"
    >
      <a-tabs :tab-bar-style="{ textAlign: 'center', borderBottom: 'unset' }">
        <a-tab-pane key="register" tab="用户注册"> </a-tab-pane>
      </a-tabs>
      <a-form-item required has-feedback name="username" label="用户名">
        <a-input v-model:value="formState.username" placeholder="用户名" size="large" autocomplete="off">
          <template #prefix>
            <span class="iconify" data-icon="ion:person" data-inline="false"></span>
          </template>
        </a-input>
      </a-form-item>
      <a-form-item has-feedback name="password" label="密码">
        <a-input-password v-model:value="formState.password" placeholder="密码" size="large" autocomplete="off">
          <template #prefix>
            <span class="iconify" data-icon="ion:lock-closed" data-inline="false"></span>
          </template>
        </a-input-password>
      </a-form-item>
      <a-form-item has-feedback name="confirmPassword" label="确认密码">
        <a-input-password v-model:value="formState.confirmPassword" placeholder="确认密码" size="large" autocomplete="off">
          <template #prefix>
            <span class="iconify" data-icon="ion:lock-closed" data-inline="false"></span>
          </template>
        </a-input-password>
      </a-form-item>

      <a-form-item>
        <a-button type="primary" size="large" html-type="submit" class="login-button">注册</a-button>
      </a-form-item>

      <a-form-item class="user-login-other">
        <router-link class="register" :to="{ name: 'login' }"> 登录 </router-link>
      </a-form-item>
    </a-form>
  </div>
</template>
<script lang="ts">
import { defineComponent, reactive, ref, toRaw } from "vue";
import { useUserStore } from "/src/store/modules/user";
import { utils } from "@fast-crud/fast-crud";
export default defineComponent({
  name: "RegisterPage",
  setup() {
    const userStore = useUserStore();
    const formRef = ref();
    const formState: any = reactive({
      username: "",
      password: "",
      confirmPassword: ""
    });

    const rules = {
      username: [
        {
          required: true,
          trigger: "change",
          message: "请输入用户名"
        }
      ],
      password: [
        {
          required: true,
          trigger: "change",
          message: "请输入密码"
        }
      ],
      confirmPassword: [
        {
          required: true,
          trigger: "change",
          message: "请确认密码"
        }
      ]
    };
    const layout = {
      labelCol: {
        span: 0
      },
      wrapperCol: {
        span: 24
      }
    };

    const handleFinish = async (values: any) => {
      await userStore.register(
        toRaw({
          password: formState.password,
          username: formState.username
        }) as any
      );
    };

    const handleFinishFailed = (errors: any) => {
      utils.logger.log(errors);
    };

    const resetForm = () => {
      formRef.value.resetFields();
    };

    return {
      formState,
      formRef,
      rules,
      layout,
      handleFinishFailed,
      handleFinish,
      resetForm
    };
  }
});
</script>

<style lang="less">
@import "../../../style/theme/index.less";
.user-layout-register {
  label {
    font-size: 14px;
  }

  .login-title {
    // color: @primary-color;
    font-size: 18px;
    text-align: center;
    margin: 30px;
    margin-top: 50px;
  }
  .getCaptcha {
    display: block;
    width: 100%;
    height: 40px;
  }

  .forge-password {
    font-size: 14px;
  }

  button.login-button {
    padding: 0 15px;
    font-size: 16px;
    height: 40px;
    width: 100%;
  }

  .user-login-other {
    text-align: left;
    margin-top: 30px;
    margin-bottom: 30px;
    line-height: 22px;

    .item-icon {
      font-size: 24px;
      color: rgba(0, 0, 0, 0.2);
      margin-left: 16px;
      vertical-align: middle;
      cursor: pointer;
      transition: color 0.3s;

      &:hover {
        color: @primary-color;
      }
    }

    .register {
      float: right;
    }
  }
  .iconify {
    color: rgba(0, 0, 0, 0.45);
  }
}
</style>
