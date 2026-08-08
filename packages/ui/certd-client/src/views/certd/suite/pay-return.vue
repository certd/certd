<template>
  <div>
    <h1>支付成功</h1>
    <div>
      <a-button type="primary" @click="handleBack">返回</a-button>
    </div>
  </div>
</template>
<script lang="ts" setup>
function handleBack() {
  window.location.href = "/";
}
</script>
