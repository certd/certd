<template>
  <div class="cd-payment-return w-100">
    <div v-if="payResult == null" class="flex-o m-20 w-100">
      <a-spin />
    </div>
    <a-result v-else-if="payResult" status="success" title="支付成功">
      <template #extra>
        <a-button key="console" type="primary" @click="goHome">回首页</a-button>
      </template>
    </a-result>
    <a-result v-else status="error" title="支付失败">
      <template #extra>
        <a-button key="console" type="primary" @click="goHome">回首页</a-button>
      </template>
    </a-result>
  </div>
</template>

<script setup lang="ts">
import { Ref, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import * as api from "./api";
const route = useRoute();
const type = route.params.type as string;

const query = route.query;

async function checkNotify() {
  // const res = await api.Notify(type, query);
  const res = "success";
  if (res === "success") {
    return true;
  }
  return false;
}

const payResult: Ref = ref(null);
async function check() {
  const pass = await checkNotify();
  if (!pass) {
    payResult.value = false;
  } else {
    payResult.value = true;
  }
}
check();

const router = useRouter();
function goHome() {
  router.push({
    path: "/",
  });
}
</script>
