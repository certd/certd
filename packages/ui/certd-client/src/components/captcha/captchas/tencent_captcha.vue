<template>
  <div ref="captchaRef" class="tencent_captcha_wrapper" :class="{ tencent_captcha_ok: modelValue }" @click="triggerCaptcha">
    <div class="validation-box" :class="{ validated: modelValue != null }">
      <div class="sweep-animation"></div>
      <div class="box-content">
        <div class="box-icon">✓</div>
        <span v-if="modelValue == null" class="status-text">点击进行验证</span>
        <span v-else class="status-text">验证成功</span>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { notification } from "ant-design-vue";
import { ref, Ref, watch } from "vue";

import { loadScript } from "vue-plugin-load-script";
const loaded = ref(false);
async function loadCaptchaScript() {
  // 加载验证码js
  // var appid = "您的CaptchaAppId";
  // loadScript("https://turing.captcha.qq.com/TJCaptcha.js?appid=" + appid);
  await loadScript("https://turing.captcha.qcloud.com/TJCaptcha.js");
  loaded.value = true;
}
loadCaptchaScript();

defineOptions({
  name: "TencentCaptcha",
});
const emit = defineEmits(["update:modelValue", "change"]);
const props = defineProps<{
  modelValue: any;
  captchaGet: () => Promise<any>;
}>();
const captchaRef = ref(null);

const captchaInstanceRef: Ref = ref({});

// 定义回调函数
function callback(res: { ret: number; ticket: string; randstr: string; errorCode?: number; errorMessage?: string }) {
  // 第一个参数传入回调结果，结果如下：
  // ret         Int       验证结果，0：验证成功。2：用户主动关闭验证码。
  // ticket      String    验证成功的票据，当且仅当 ret = 0 时 ticket 有值。
  // CaptchaAppId       String    验证码应用ID。
  // bizState    Any       自定义透传参数。
  // randstr     String    本次验证的随机串，后续票据校验时需传递该参数。
  // verifyDuration     Int   验证码校验接口耗时（ms）。
  // actionDuration     Int   操作校验成功耗时（用户动作+校验完成）(ms)。
  // sid     String   链路sid。
  console.log("callback:", res);
  // res（用户主动关闭验证码）= {ret: 2, ticket: null}
  // res（验证成功） = {ret: 0, ticket: "String", randstr: "String"}
  // res（请求验证码发生错误，验证码自动返回trerror_前缀的容灾票据） = {ret: 0, ticket: "String", randstr: "String",  errorCode: Number, errorMessage: "String"}
  // 此处代码仅为验证结果的展示示例，真实业务接入，建议基于ticket和errorCode情况做不同的业务处理

  if (res.errorCode && res.errorCode > 0) {
    notification.error({
      message: `验证码验证失败：${res.errorMessage || res.errorCode}`,
    });
  }

  if (res.ret === 0) {
    emitChange({
      ticket: res.ticket,
      randstr: res.randstr,
    });
  } else if (res.ret === 2) {
    console.log("用户主动关闭验证码");
  }
}

// 定义验证码js加载错误处理函数
function loadErrorCallback(error: any) {
  // var appid = "您的CaptchaAppId";
  // // 生成容灾票据或自行做其它处理
  // var ticket = "trerror_1001_" + appid + "_" + Math.floor(new Date().getTime() / 1000);
  // callback({
  //   ret: 0,
  //   randstr: "@" + Math.random().toString(36).substr(2),
  //   ticket: ticket,
  //   errorCode: 1001,
  //   errorMessage: "jsload_error",
  // });
  notification.error({
    message: `验证码加载失败：${error?.message || error}`,
  });
}
async function triggerCaptcha() {
  if (!loaded.value) {
    notification.error({
      message: "验证码还未加载完成，请稍后再试",
    });
    return;
  }

  const { captchaAppId } = await props.captchaGet();

  try {
    // 生成一个验证码对象
    // CaptchaAppId：登录验证码控制台，从【验证管理】页面进行查看。如果未创建过验证，请先新建验证。注意：不可使用客户端类型为小程序的CaptchaAppId，会导致数据统计错误。
    //callback：定义的回调函数
    // @ts-ignore
    var captcha = new TencentCaptcha(captchaAppId + "", callback, {
      userLanguage: "zh-cn",
      // showFn: (ret: any) => {
      //   const {
      //     duration, // 验证码渲染完成的耗时(ms)
      //     sid, // 链路sid
      //   } = ret;
      // },
    });
    // 调用方法，显示验证码
    captcha.show();
  } catch (error) {
    // 加载异常，调用验证码js加载错误处理函数
    loadErrorCallback(error);
  }
}

function emitChange(value: any) {
  emit("update:modelValue", value);
  emit("change", value);
}
function reset() {
  captchaInstanceRef.value?.instance?.reset();
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
.tencent_captcha_wrapper {
  .validation-box {
    width: 100%;
    height: 40px;
    margin: 0 auto 30px;
    border: 1px solid #ddd;
    border-radius: 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
    background-color: #f9f9f9;
  }

  .validation-box:hover {
    border-color: #aaa;
    background-color: #f0f0f0;
  }

  .validation-box.validated {
    border-color: #4caf50;
    background-color: #f1f8e9;
  }

  .box-content {
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
    position: relative;
  }

  .box-icon {
    font-size: 18px;
    color: #bbb;
    margin-right: 15px;
    transition: all 0.3s ease;
  }

  .validation-box.validated .box-icon {
    color: #4caf50;
  }

  .status-text {
    font-size: 14px;
    font-weight: 500;
    color: #888;
    transition: all 0.3s ease;
  }

  .validation-box.validated .status-text {
    color: #4caf50;
    font-weight: 600;
  }

  /* 划过动画效果 */
  .sweep-animation {
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(76, 175, 80, 0.2), transparent);
    z-index: 1;
    opacity: 0;
    transition: opacity 0.3s;
  }

  .validation-box.validated .sweep-animation {
    animation: sweep 0.8s ease forwards;
    opacity: 1;
  }

  @keyframes sweep {
    0% {
      left: -100%;
    }
    50% {
      left: 0;
    }
    100% {
      left: 100%;
    }
  }
}
</style>
