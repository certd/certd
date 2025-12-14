<template>
  <div class="params-show">
    <a-tag type="primary" color="green" v-for="item of params" :key="item.value" class="item">
      <span class="label">{{ item.label }}=</span>
      <fs-copyable :modelValue="`\$\{${item.value}\}`" :button="{show:false}" :inline="true"></fs-copyable>
    </a-tag>
  </div>
</template>
<script setup lang="ts">
defineOptions({
  name: "ParamsShow",
});

const props = defineProps<{
  params: { value: string; label: string }[];
}>();
</script>

<style lang="less">
.params-show {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  min-height: 32px;

  .item {
    display: flex;
    align-items: center;
    margin-bottom: 2px;
    margin-top: 2px;
  }
}
</style>
