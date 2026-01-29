<template>
  <div class="cf-turnstile">
    <div id="turnstile-container" class="cf-turnstile-container" :data-sitekey="siteKeyRef"></div>
  </div>
</template>
<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";

import { loadScript } from "vue-plugin-load-script";
const loaded = ref(false);
async function loadCaptchaScript() {
  await loadScript("https://challenges.cloudflare.com/turnstile/v0/api.js");
  loaded.value = true;
}

defineOptions({
  name: "CfTurnstileCaptcha",
});
const emit = defineEmits(["update:modelValue", "change"]);
const props = defineProps<{
  modelValue: any;
  captchaGet: () => Promise<any>;
}>();
const captchaRef = ref(null);
const siteKeyRef = ref("");
const widgetIdRef = ref(null);

onMounted(async () => {
  await loadCaptchaScript();
  await nextTick();
  const { siteKey } = await props.captchaGet();
  siteKeyRef.value = siteKey; //这里确定是string类型
  //@ts-ignore
  const widgetId = turnstile.render("#turnstile-container", {
    sitekey: siteKey,
    size: "flexible",
    callback: function (token: string) {
      console.log("turnstile success:", token);
      emitChange({
        token: token,
      });
    },
  });
  widgetIdRef.value = widgetId;
});

onUnmounted(() => {
  //@ts-ignore
  if (turnstile && widgetIdRef.value) {
    //@ts-ignore
    turnstile.remove(widgetIdRef.value);
  }
});

function checkExpired() {
  //@ts-ignore
  if (turnstile && widgetIdRef.value) {
    //@ts-ignore
    return turnstile.isExpired(widgetIdRef.value);
  }
}

function emitChange(value: any) {
  emit("update:modelValue", value);
  emit("change", value);
}
function reset() {
  // 重置验证码
  //@ts-ignore
  if (turnstile && widgetIdRef.value) {
    //@ts-ignore
    turnstile.reset(widgetIdRef.value);
  }
}

watch(
  () => {
    return props.modelValue;
  },
  value => {
    if (value == null) {
      reset();
    }
  }
);

defineExpose({
  reset,
});
</script>
<style lang="less">
.cf-turnstile-container {
  iframe {
    width: 100% !important;
  }
}
</style>
