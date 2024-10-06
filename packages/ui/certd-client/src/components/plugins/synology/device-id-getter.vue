<template>
  <div>
    <contextHolder />
    <a-input v-bind="attrs" :value="value" :allow-clear="true" @update:value="emit('update:value', $event)">
      <template #suffix>
        <a-tag class="cursor-pointer" @click="getDeviceId">获取设备ID</a-tag>
      </template>
    </a-input>
  </div>
</template>

<script lang="tsx" setup>
import { defineProps, ref, useAttrs } from "vue";
import { Modal } from "ant-design-vue";
import { ComponentPropsType, doRequest } from "/@/components/plugins/lib";

defineOptions({
  name: "DeviceIdGetter"
});

const props = defineProps<ComponentPropsType>();

const emit = defineEmits<{
  "update:value": any;
}>();

const attrs = useAttrs();

const otpCodeRef = ref("");

async function loginWithOTPCode(otpCode: string) {
  return await doRequest({
    type: props.type,
    typeName: props.typeName,
    action: "LoginWithOPTCode",
    data: {
      otpCode
    },
    input: props.form
  });
}

const [modal, contextHolder] = Modal.useModal();
async function getDeviceId() {
  //打开对话框

  modal.confirm({
    title: "请输入OTP验证码",
    maskClosable: true,
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
