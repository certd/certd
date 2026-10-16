<template>
  <fs-page class="page-suite-buy">
    <template #header>
      <div class="title">{{ $t("certd.suite.suiteBuy") }}</div>
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
        <a-button type="primary" :loading="activating" @click="openActivateDialog">{{ $t("certd.suite.activationExchange") }}</a-button>
      </div>
      <a-row :gutter="8">
        <a-col v-for="item of suites" :key="item.id" class="mb-10 suite-card-col">
          <product-info :product="item" @order="doOrder" />
        </a-col>
        <a-col v-for="item of addons" :key="item.id" class="mb-10 suite-card-col">
          <product-info :product="item" @order="doOrder" />
        </a-col>
      </a-row>

      <a-empty v-if="suites.length == 0 && addons.length == 0" class="w-100 mt-10" :description="$t('certd.suite.noSuite')" />
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
import { useFormDialog } from "/@/use/use-dialog";
import { useI18n } from "vue-i18n";

const suites = ref([]);
const addons = ref([]);

const activationCode = ref("");
const activating = ref(false);
const { openFormDialog } = useFormDialog();
const { t } = useI18n();

async function openActivateDialog() {
  await openFormDialog({
    title: t("certd.suite.activationExchange"),
    wrapper: { width: 520 },
    initialForm: {
      code: activationCode.value,
    },
    columns: {
      code: {
        title: t("certd.suite.activationCode"),
        type: "text",
        form: {
          col: { span: 24 },
          rules: [{ required: true, message: t("certd.suite.enterActivationCode") }],
          component: {
            placeholder: t("certd.suite.enterCdkCode"),
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
    notification.warning({ message: t("certd.suite.enterActivationCode") });
    return;
  }
  activationCode.value = code;
  activating.value = true;
  try {
    const res = await api.UseActivationCode(code);
    activationCode.value = "";
    notification.success({
      message: t("certd.suite.activateSuccess"),
      description: `您已成功激活 ${res.title}，时长 ${res.duration} 天`,
    });
  } catch (e: any) {
    notification.error({ message: e?.message || t("certd.suite.exchangeFailed") });
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
    return t("certd.suite.suiteHelperStack");
  }
  return t("certd.suite.suiteHelperLatest");
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
