<template>
  <div class="flex">
    <a-input :value="valueRef" :placeholder="t('certd.captcha.inputImageCode')" autocomplete="off" @update:value="onChange">
      <template #prefix>
        <fs-icon icon="ion:image-outline"></fs-icon>
      </template>
    </a-input>
    <div class="input-right pointer" :title="t('certd.captcha.refresh')">
      <img class="image-code" :src="imageCodeSrc" @click="resetImageCode" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
  modelValue: any;
  captchaGet?: () => Promise<any>;
}>();
defineOptions({
  name: "ImageCaptcha",
});
const { t } = useI18n();
const emit = defineEmits(["update:modelValue", "change"]);

const valueRef = ref("");
const randomStrRef = ref();
const imageCodeSrc = ref();
async function resetImageCode() {
  const res = await props.captchaGet();
  randomStrRef.value = res.randomStr;
  valueRef.value = "";
  emitChange(null);
  imageCodeSrc.value = "data:image/svg+xml," + encodeURIComponent(res.imageData);
}

function getCaptchaForm() {
  return {
    imageCode: valueRef.value,
    randomStr: randomStrRef.value,
  };
}
defineExpose({
  resetImageCode,
  getCaptchaForm,
  reset: resetImageCode,
});

resetImageCode();

function onChange(value: string) {
  valueRef.value = value;
  const form = getCaptchaForm();
  emitChange(form);
}

watch(
  () => {
    return props.modelValue;
  },
  value => {
    if (value == null) {
      resetImageCode();
    }
  }
);

function emitChange(value: any) {
  emit("update:modelValue", value);
  emit("change", value);
}
</script>
