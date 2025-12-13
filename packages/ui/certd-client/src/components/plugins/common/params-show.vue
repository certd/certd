<template>
  <div class="params-show">
    <div v-for="item of params" :key="item.value" class="item">
      <span class="label">{{ item.label }}:</span>
      <fs-copyable>{{ item.value }}</fs-copyable>
    </div>
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

  .item {
    width: 200px;
    display: flex;
    margin-bottom: 5px;
    align-items: center;

    .label {
      width: 100px;
    }

    .fs-copyable {
      width: 100%;
    }
  }
}
</style>
