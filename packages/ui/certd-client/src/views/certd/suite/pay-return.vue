<template>
  <div>
    <h1>Payment Successful</h1>
    <div>
      <a-button type="primary" @click="handleBack">Back</a-button>
    </div>
  </div>
</template>
<script lang="ts" setup>
function handleBack() {
  window.location.href = "/";
}
</script>
