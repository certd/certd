<template>
  <a-card :title="product.title" class="product-card">
    <template #extra>
      <fs-values-format :model-value="product.type" :dict="productTypeDictRef"></fs-values-format>
    </template>

    <div class="product-intro">{{ product.intro || "暂无介绍" }}</div>
    <a-divider />
    <div>
      <div class="flex-between mt-5">
        <div class="flex-o"><fs-icon icon="ant-design:check-outlined" class="color-green mr-5" /> 流水线条数：</div>
        <suite-value :model-value="product.content.maxPipelineCount" unit="条" />
      </div>
      <div class="flex-between mt-5">
        <div class="flex-o"><fs-icon icon="ant-design:check-outlined" class="color-green mr-5" />域名总数量：</div>
        <suite-value :model-value="product.content.maxDomainCount" unit="个" />
      </div>
      <div class="flex-between mt-5">
        <div class="flex-o" style="padding-left: 2em">- 其中泛域名数量：</div>
        <suite-value :model-value="product.content.maxWildcardDomainCount" unit="个" />
      </div>
      <div class="flex-between mt-5">
        <div class="flex-o">
          <fs-icon icon="ant-design:check-outlined" class="color-green mr-5" />
          部署次数：
          <a-tooltip title="只有运行成功才会扣除部署次数">
            <fs-icon class="font-size-16 ml-5" icon="mingcute:question-line"></fs-icon>
          </a-tooltip>
        </div>
        <suite-value :model-value="product.content.maxDeployCount" unit="次" />
      </div>
      <div class="flex-between mt-5">
        <div class="flex-o"><fs-icon icon="ant-design:check-outlined" class="color-green mr-5" /> 证书监控：</div>
        <suite-value :model-value="product.content.maxMonitorCount" unit="个" />
      </div>
    </div>
    <a-divider />
    <div class="duration flex-between mt-5">
      <div class="flex-o duration-label">时长</div>
      <div class="duration-list">
        <div v-for="dp of product.durationPrices" :key="dp.duration" class="duration-item" :class="{ active: selected.duration === dp.duration }" @click="selected = dp">
          <span class="duration-text">{{ durationDict.dataMap[dp.duration]?.label }}</span>
          <span v-if="discountText(dp)" class="duration-discount">{{ discountText(dp) }}</span>
        </div>
      </div>
    </div>
    <a-divider />
    <div class="price flex-between mt-5">
      <div class="flex-o">价格</div>
      <div class="flex-o price-text">
        <price-input style="color: red" :font-size="20" :model-value="selected?.price" :edit="false" zero-text="免费" />
        <span class="price-unit">/ {{ durationDict.dataMap[selected.duration]?.label }}</span>
      </div>
    </div>

    <template #actions>
      <a-button type="primary" @click="doOrder">立即购买</a-button>
    </template>
  </a-card>
</template>
<script setup lang="ts">
import { durationDict } from "/@/views/certd/suite/api";
import SuiteValue from "/@/views/sys/suite/product/suite-value.vue";
import PriceInput from "/@/views/sys/suite/product/price-input.vue";
import { computed, ref } from "vue";
import { dict, FsIcon } from "@fast-crud/fast-crud";

const props = defineProps<{
  product: any;
}>();
const selected = ref(props.product.durationPrices[0]);

const originalUnitPrice = computed(() => {
  const unitPrices = (props.product.durationPrices || [])
    .map((item: any) => {
      const duration = Number(item.duration);
      const price = Number(item.price);
      if (!duration || duration <= 0 || price <= 0) {
        return null;
      }
      return price / duration;
    })
    .filter((item: number | null): item is number => item != null);
  return Math.max(...unitPrices, 0);
});

const productTypeDictRef = dict({
  data: [
    { value: "suite", label: "套餐", color: "green" },
    { value: "addon", label: "加量包", color: "blue" },
  ],
});

const emit = defineEmits(["order"]);
function discountText(durationPrice: any) {
  const duration = Number(durationPrice.duration);
  const price = Number(durationPrice.price);
  if (!duration || duration <= 0 || price <= 0 || originalUnitPrice.value <= 0) {
    return "";
  }
  const currentUnitPrice = price / duration;
  const discount = Math.round((currentUnitPrice / originalUnitPrice.value) * 100) / 10;
  if (discount >= 10) {
    return "";
  }
  return `${discount}折`;
}

async function doOrder() {
  emit("order", { product: props.product, productId: props.product.id, duration: selected.value.duration, price: selected.value.price });
}
</script>

<style lang="less">
.product-card {
  .ant-card-body {
    padding: 20px;
    padding-top: 10px;
    padding-bottom: 10px;

    .product-intro {
      font-size: 13px;
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 28px;
      height: 28px;
    }

    .ant-divider {
      margin: 8px 0;
    }
  }
  .duration-label {
    width: 32px;
  }
  .duration-list {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 4px;
    .duration-item {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      position: relative;
      min-width: 56px;
      height: 32px;
      border: 1px solid #cdcdcd;
      border-radius: 4px;
      text-align: center;
      padding: 3px 6px;
      cursor: pointer;
      line-height: 16px;

      &:hover {
        border-color: #1890ff;
      }
      &.active {
        border-color: #a6fba3;
        background-color: #c1eafb;
      }
    }

    .duration-text {
      display: block;
      line-height: 20px;
      white-space: nowrap;
    }

    .duration-discount {
      position: absolute;
      top: -9px;
      right: -7px;
      height: 16px;
      padding: 0 4px;
      border-radius: 8px 8px 8px 2px;
      background: #ff4d4f;
      color: #f5222d;
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      line-height: 16px;
      white-space: nowrap;
      box-shadow: 0 2px 6px rgba(245, 34, 45, 0.24);
    }
  }

  .price-text {
    flex: none;
    align-items: baseline;
    justify-content: flex-end;
    white-space: nowrap;
  }

  .price-unit {
    flex: none;
    margin-left: 5px;
    color: hsl(var(--muted-foreground));
    font-size: 12px;
    white-space: nowrap;
  }
}
</style>
