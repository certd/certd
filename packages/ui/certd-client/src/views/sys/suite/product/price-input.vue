<template>
  <div class="flex-o price-input">
    <a-input-number v-if="edit" prefix="¥" :value="priceValue" :precision="2" class="price-input-number" @update:value="onPriceChange"> </a-input-number>
    <span v-else class="price-text" :style="style">{{ priceLabel }}</span>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { utils } from "/@/utils";
const props = withDefaults(
  defineProps<{
    modelValue?: number;
    edit?: boolean;
    fontSize?: number;
    zeroText?: string;
  }>(),
  {
    modelValue: 0,
    edit: false,
    fontSize: 14,
    zeroText: "¥0",
  }
);

const style = computed(() => {
  if (props.fontSize == null) {
    return {};
  }
  return {
    fontSize: props.fontSize + "px",
  };
});

const priceValue = computed(() => {
  if (props.modelValue == null) {
    return 0;
  }
  return utils.amount.toYuan(props.modelValue);
});

const priceLabel = computed(() => {
  if (priceValue.value === 0) {
    return props.zeroText;
  }
  return `¥${priceValue.value}`;
});

const emit = defineEmits(["update:modelValue"]);

const onPriceChange = (price: number) => {
  emit("update:modelValue", utils.amount.toCent(price));
};
</script>

<style lang="less">
.price-input {
  width: 100%;

  .price-input-number {
    width: 100%;
  }

  .price-text {
    color: red;
  }
}
</style>
