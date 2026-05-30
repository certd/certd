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
      <div class="suite-buy-action-row mt-10 pl-1">
        <a-button type="primary" :loading="activating" @click="openActivateDialog">激活码兑换</a-button>
      </div>
      <a-row :gutter="8">
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
import { message } from "ant-design-vue";
import * as api from "./api";
import ProductInfo from "/@/views/certd/suite/product-info.vue";
import OrderModal from "/@/views/certd/suite/order-modal.vue";
import { notification } from "ant-design-vue";
import { useFormDialog } from "/@/use/use-dialog";

const suites = ref([]);
const addons = ref([]);

const activationCode = ref("");
const activating = ref(false);
const { openFormDialog } = useFormDialog();

async function openActivateDialog() {
  await openFormDialog({
    title: "激活码兑换",
    wrapper: { width: 520 },
    initialForm: {
      code: activationCode.value,
    },
    columns: {
      code: {
        title: "激活码",
        type: "text",
        form: {
          col: { span: 24 },
          rules: [{ required: true, message: "请输入激活码" }],
          component: {
            placeholder: "请输入 CDK 激活码",
          },
        },
      },
    },
    async onSubmit(form: any) {
      activationCode.value = form.code;
      await doActivate();
    },
  });
}

async function doActivate() {
  const code = activationCode.value.trim().toUpperCase();
  if (!code) {
    message.warning("请输入激活码");
    return;
  }
  activationCode.value = code;
  activating.value = true;
  try {
    const res = await api.UseActivationCode(code);
    activationCode.value = "";
    notification.success({
      message: "激活成功",
      description: `您已成功激活 ${res.title}，时长 ${res.duration} 天`,
    });
  } catch (e: any) {
    message.error(e?.message || "兑换失败");
  } finally {
    activating.value = false;
  }
}

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
    .suite-buy-action-row {
      width: 100%;
      margin-bottom: 10px;
      display: flex;
      justify-content: flex-start;
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
