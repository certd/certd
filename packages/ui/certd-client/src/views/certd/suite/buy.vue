<template>
  <fs-page class="page-suite-buy">
    <template #header>
      <div class="title">套餐购买</div>
    </template>
    <div class="suite-buy-content">
      <a-row class="w-100" :gutter="8">
        <a-col :span="24">
          <a-card>
            <div class="suite-intro-box">
              <div>{{ buyHelperText }}</div>
              <div v-if="suiteIntro" v-html="suiteIntro"></div>
            </div>
          </a-card>
        </a-col>
      </a-row>
      <a-row :gutter="8" class="mt-10">
        <a-col v-for="item of suites" :key="item.id" class="mb-10 suite-card-col">
          <product-info :product="item" @order="doOrder" />
        </a-col>
        <a-col v-for="item of addons" :key="item.id" class="mb-10 suite-card-col">
          <product-info :product="item" @order="doOrder" />
        </a-col>
      </a-row>

      <a-empty v-if="suites.length == 0 && addons.length == 0" class="w-100 mt-10" description="暂无套餐可购买" />
    </div>

    <order-modal ref="orderModalRef" />
  </fs-page>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import * as api from "./api";
import ProductInfo from "/@/views/certd/suite/product-info.vue";
import OrderModal from "/@/views/certd/suite/order-modal.vue";
import { notification } from "ant-design-vue";

const suites = ref([]);
const addons = ref([]);

async function loadProducts() {
  const list = await api.ProductList();
  suites.value = list.filter((x: any) => x.type === "suite");
  addons.value = list.filter((x: any) => x.type === "addon");
}

loadProducts();
const orderModalRef = ref<any>(null);
async function doOrder(req: any) {
  await orderModalRef.value.open({
    ...req,
  });
}

const suiteIntro = ref("");
const allowSuiteStack = ref(false);
const buyHelperText = computed(() => {
  if (allowSuiteStack.value) {
    return "说明：可以购买多个套餐和加量包，套餐和加量包内的数量可以叠加";
  }
  return "说明：① 同一时间只有最新购买的一个套餐生效；② 可以购买多个加量包，加量包立即生效；③ 套餐和加量包内的数量可以叠加";
});
async function loadSuiteIntro() {
  const res = await api.GetSuiteSetting();
  suiteIntro.value = res.intro;
  allowSuiteStack.value = !!res.allowSuiteStack;
}
loadSuiteIntro();
</script>

<style lang="less">
.page-suite-buy {
  .title {
    background-color: #fff;
  }
  background: #f0f2f5;
  .suite-buy-content {
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: baseline;

    .suite-intro-box {
      //height: 60px;
      //overflow: hidden;
      //text-overflow: ellipsis;
    }

    .suite-list {
      display: flex;
      align-items: baseline;
    }
    .my-suites {
      width: 360px;
      margin-left: 10px;
    }

    .price-text {
      align-items: baseline;
      font-family: "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
    }

    .prices {
      display: flex;
      justify-content: left;
      margin-top: 20px;
      .price-item {
        border: 1px solid #c6c6c6;
        background-color: #f8ebda;
        padding: 10px;
        text-align: center;
        cursor: pointer;
        width: 100px;
        &:hover {
          border-color: #38a0fb;
        }
        &.active {
          border-color: #1890ff;
        }
        margin-right: 10px;
      }
    }

    .suite-card-col {
      width: 20% !important;
      min-width: 354px !important;
    }
  }
}
</style>
