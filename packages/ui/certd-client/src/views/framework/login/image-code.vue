<template>
  <div class="flex">
    <a-input :value="value" placeholder="请输入图片验证码" autocomplete="off" @update:value="onChange">
      <template #prefix>
        <fs-icon icon="ion:image-outline"></fs-icon>
      </template>
    </a-input>
    <div class="input-right pointer" title="点击刷新">
      <img class="image-code" :src="imageCodeUrl" @click="resetImageCode" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, useAttrs, defineExpose } from "vue";
import { nanoid } from "nanoid";

const props = defineProps<{
  randomStr?: string;
  value?: string;
}>();
const emit = defineEmits(["update:value", "update:randomStr", "change"]);

function onChange(value: string) {
  emit("update:value", value);
  emit("change", value);
}

const imageCodeUrl = ref();
function resetImageCode() {
  const randomStr = nanoid(10);
  let url = "api/basic/code/captcha";
  imageCodeUrl.value = url + "?randomStr=" + randomStr;
  emit("update:randomStr", randomStr);
}

defineExpose({
  resetImageCode,
})

resetImageCode();
</script>
