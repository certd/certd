<script setup lang="ts">
import { ref } from "vue";
import TutorialSteps from "/@/components/tutorial/tutorial-steps.vue";
const openedRef = ref(false);
function open() {
  openedRef.value = true;
}
function close() {
  openedRef.value = false;
}
function prev() {
  console.log("prev");
}
function next() {
  console.log("next");
}
</script>

<template>
  <div class="tutorial-button" @click="open">
    <fs-icon icon="mingcute:question-line"></fs-icon>
    <div class="ml-5">使用教程</div>
    <a-modal v-model:open="openedRef" class="tutorial-modal" width="90%">
      <template #title> 使用教程 </template>
      <tutorial-steps v-if="openedRef" />
      <template #footer></template>
    </a-modal>
  </div>
</template>

<style lang="less">
.tutorial-modal {
  top: 50px;
  .ant-modal-body {
    height: 80vh;
  }
}
</style>
