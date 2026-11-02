<template>
  <div class="fn-tabs" role="tablist">
    <div
      v-for="item in tabs"
      :key="item.value"
      class="fn-tabs-item"
      :class="{ active: modelValue === item.value }"
      type="button"
      role="tab"
      :aria-selected="modelValue === item.value"
      @click="$emit('update:modelValue', item.value)"
    >
      {{ item.label }}<span v-if="showCount" class="fn-tabs-count">{{ item.count || 0 }}</span>
    </div>
  </div>
</template>

<script setup lang="jsx">
const props = defineProps({
  tabs: {
    type: Array,
    required: true,
  },
  modelValue: {
    type: String,
    default: "",
  },
  showCount: {
    type: Boolean,
    default: true,
  },
});

defineEmits(["update:modelValue"]);
</script>

<style lang="less">
.fn-tabs {
  display: flex;
  flex: none;
  gap: 24px;
  .fn-tabs-item {
    &:first-child {
      margin-left: 20px;
    }
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    min-height: 40px;
    padding: 0 1px;
    border: 0;
    color: #8a95a6;
    background: transparent;
    font-size: 13px;
    cursor: pointer;

    &.active {
      color: #172033;
      font-weight: 600;

      &::after {
        position: absolute;
        right: 0;
        bottom: -1px;
        left: 0;
        height: 2px;
        background: #e54b4b;
        content: "";
      }
    }
  }

  .fn-tabs-count {
    margin-left: 5px;
    color: #a3acb9;
    font-size: 11px;
  }

  body.dark & {
    .fn-tabs-item.active {
      color: rgba(255, 255, 255, 0.95);
    }

    .fn-tabs-item.active .fn-tabs-count {
      color: rgba(255, 255, 255, 0.7);
    }
  }
}
</style>
