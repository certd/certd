<template>
  <div class="flex">
    <a-input :value="value" placeholder="短信验证码" @update:value="onChange">
      <template #prefix>
        <fs-icon icon="ion:mail-outline"></fs-icon>
      </template>
    </a-input>
    <div class="input-right">
      <a-button class="getCaptcha" type="primary" tabindex="-1" :disabled="smsSendBtnDisabled" @click="sendSmsCode">
        {{ smsTime <= 0 ? "发送" : smsTime + " s" }}
      </a-button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, useAttrs } from "vue";
import { notification } from "ant-design-vue";
import * as api from "/@/store/settings/api.basic";

const props = defineProps<{
  value?: string;
  mobile?: string;
  phoneCode?: string;
  imgCode?: string;
  randomStr?: string;
  verificationType?: string;
}>();
const emit = defineEmits(["update:value", "change"]);

function onChange(value: string) {
  emit("update:value", value);
  emit("change", value);
}
const loading = ref(false);
const smsTime = ref(0);
const smsSendBtnDisabled = computed(() => {
  if (loading.value) {
    return true;
  }
  if (smsTime.value === 0) {
    return false;
  }
  return smsTime.value > 0;
});

async function sendSmsCode() {
  if (!props.mobile) {
    notification.error({ message: "请输入手机号" });
    return;
  }
  if (!props.imgCode) {
    notification.error({ message: "请输入图片验证码" });
    return;
  }
  loading.value = true;
  try {
    await api.sendSmsCode({
      phoneCode: props.phoneCode,
      mobile: props.mobile,
      imgCode: props.imgCode,
      randomStr: props.randomStr,
      verificationType: props.verificationType,
    });
  } finally {
    loading.value = false;
  }
  smsTime.value = 60;
  setInterval(() => {
    smsTime.value--;
  }, 1000);
}
</script>
