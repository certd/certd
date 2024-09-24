<template>
  <div>
    <contextHolder />
    <a-input :value="value" :allow-clear="true" @update:value="emit('update:value', $event)">
      <template #suffix>
        <a-tag class="cursor-pointer" @click="getDeviceId">获取设备ID</a-tag>
      </template>
    </a-input>
  </div>
</template>

<script lang="tsx" setup>
import { defineProps, ref, useAttrs } from "vue";
import { request } from "/@/api/service";
import { Modal } from "ant-design-vue";

const props = defineProps<{
  type: string;
  typeName: string;
  form: any;
  value?: any;
}>();

const emit = defineEmits<{
  "update:value": any;
}>();

const attrs = useAttrs();

const otpCodeRef = ref("");

async function doRequest(action: string, data: any) {
  const res = await request({
    url: "/pi/handle",
    method: "post",
    data: {
      type: props.type,
      typeName: props.typeName,
      action,
      data: data,
      input: props.form.access
    }
  });
  return res;
}

async function loginWithOTPCode(otpCode: string) {
  return await doRequest("LoginWithOPTCode", {
    otpCode
  });
}

const [modal, contextHolder] = Modal.useModal();
async function getDeviceId() {
  //打开对话框

  modal.confirm({
    title: "请输入OTP验证码",
    content: () => {
      return (
        <a-form-item-rest>
          <a-input v-model:value={otpCodeRef.value} placeholder="请输入OTP验证码" />
        </a-form-item-rest>
      );
    },
    onOk: async () => {
      const res = await loginWithOTPCode(otpCodeRef.value);
      console.log("did返回", res);
      emit("update:value", res.did);
    }
  });
}
</script>
