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
    return { color: "blue", text: "Unused" };
  }
  const now = dayjs().valueOf();
  //Expired
  const isExpired = userSuite.expiresTime != -1 && now > userSuite.expiresTime;
  if (isExpired) {
    return { color: "error", text: "Expired" };
  }
  //如果在Activation Time之前
  if (now < userSuite.activeTime) {
    return { color: "blue", text: "Pending" };
  }

  if (userSuite.isEmpty) {
    return { color: "gray", text: "Used Up" };
  }

  //YesNoYesCurrent Plan
  if (props.currentSuite && props.currentSuite.productType === "suite" && props.currentSuite.id === userSuite.id) {
    return { color: "success", text: "Current Plan" };
  }
  // YesNo在Activation Time和Expiration Time之间
  if (now > userSuite.activeTime && (userSuite.expiresTime == -1 || now < userSuite.expiresTime)) {
    if (userSuite.productType === "suite") {
      return { color: "success", text: "Valid" };
    }
    return { color: "success", text: "Active" };
  }
  return {};
});
</script>
