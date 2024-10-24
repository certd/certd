<template>
  <div class="cd-fold-box">
    <div class="handle pointer">
      <div class="line"></div>
      <div class="icon">
        <fs-icon icon="ion:chevron-collapse-sharp"></fs-icon>
      </div>
    </div>
    <div class="content" :class="{ hidden: !props.open }">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  open: boolean;
}>();
</script>

<style lang="less">
.cd-fold-box {
  .handle {
    height: 20px;
    display: flex;
    align-items: center;
    .line {
      //虚线
      border-top: 1px dashed #ccc;
      width: 100%;
      height: 1px;
    }
    .icon {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
  }

  .content {
    display: flex;
    flex-direction: column;
    &.hidden {
      display: none;
    }
  }
}
</style>
