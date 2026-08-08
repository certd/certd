<template>
  <a-tag :color="binding.color">{{ binding.text }}</a-tag>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import dayjs from "dayjs";

defineOptions({
  name: "UserSuiteStatus",
});

const props = defineProps<{
  userSuite: any;
  currentSuite?: any;
}>();

const binding = computed(() => {
  const userSuite = props.userSuite;
  if (!userSuite) {
    return {};
  }
  if (userSuite.activeTime == null) {
    return { color: "blue", text: "未使用" };
  }
  const now = dayjs().valueOf();
  //已过期
  const isExpired = userSuite.expiresTime != -1 && now > userSuite.expiresTime;
  if (isExpired) {
    return { color: "error", text: "已过期" };
  }
  //如果在激活时间之前
  if (now < userSuite.activeTime) {
    return { color: "blue", text: "待生效" };
  }

  if (userSuite.isEmpty) {
    return { color: "gray", text: "已用完" };
  }

  //是否是当前套餐
  if (props.currentSuite && props.currentSuite.productType === "suite" && props.currentSuite.id === userSuite.id) {
    return { color: "success", text: "当前套餐" };
  }
  // 是否在激活时间和过期时间之间
  if (now > userSuite.activeTime && (userSuite.expiresTime == -1 || now < userSuite.expiresTime)) {
    if (userSuite.productType === "suite") {
      return { color: "success", text: "有效期内" };
    }
    return { color: "success", text: "生效中" };
  }
  return {};
});
</script>
