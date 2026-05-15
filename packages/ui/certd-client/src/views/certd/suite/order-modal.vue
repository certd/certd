<template>
  <a-modal v-model:open="openRef" class="order-modal" :title="$t('certd.order.confirmTitle')" :width="670" @ok="orderCreate">
    <div v-if="product" class="order-box">
      <div class="flex-o mt-5">
        <span class="label">{{ $t("certd.order.package") }}：</span>{{ product.title }}
      </div>
      <div class="flex-o mt-5">
        <span class="label">{{ $t("certd.order.description") }}：</span>{{ product.intro }}
      </div>
      <div class="flex-o mt-5">
        <span class="label">{{ $t("certd.order.specifications") }}：</span>
        <span class="flex-o flex-wrap">
          <span class="flex-o"> {{ $t("certd.order.pipeline") }}<suite-value class="ml-5" :model-value="product.content.maxPipelineCount" :unit="$t('certd.order.unit.pieces')" />； </span>
          <span class="flex-o"> {{ $t("certd.order.totalDomain") }}<suite-value class="ml-5" :model-value="product.content.maxDomainCount" :unit="$t('certd.order.unit.count')" />； </span>
          <span class="flex-o" style="padding-left: 2em">
            - {{ $t("certd.order.includedWildcardDomain") }}<suite-value class="ml-5" :model-value="product.content.maxWildcardDomainCount" :unit="$t('certd.order.unit.count')" />；
          </span>
          <span class="flex-o"> {{ $t("certd.order.deployTimes") }}<suite-value class="ml-5" :model-value="product.content.maxDeployCount" :unit="$t('certd.order.unit.times')" />； </span>
          <span class="flex-o"> {{ $t("certd.order.monitorCount") }}<suite-value class="ml-5" :model-value="product.content.maxMonitorCount" :unit="$t('certd.order.unit.times')" />； </span>
        </span>
      </div>

      <div class="flex-o mt-5">
        <span class="label">{{ $t("certd.order.duration") }}：</span>
        <duration-value v-model="formRef.duration"></duration-value>
      </div>
      <div class="flex-o mt-5">
        <span class="label">{{ $t("certd.order.price") }}：</span>
        <price-input :edit="false" :model-value="durationSelected.price"></price-input>
      </div>

      <div class="flex-o mt-5">
        <span class="label">{{ $t("certd.order.paymentMethod") }}：</span>
        <div v-if="durationSelected.price === 0">{{ $t("certd.order.free") }}</div>
        <fs-dict-select v-else v-model:value="formRef.payType" :dict="paymentsDictRef" style="width: 200px"> </fs-dict-select>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="tsx">
import { ref } from "vue";
import { GetPaymentTypes, OrderModalOpenReq, TradeCreate } from "/@/views/certd/suite/api";
import SuiteValue from "/@/views/sys/suite/product/suite-value.vue";
import PriceInput from "/@/views/sys/suite/product/price-input.vue";
import { dict } from "@fast-crud/fast-crud";
import { Modal, notification } from "ant-design-vue";
import DurationValue from "/@/views/sys/suite/product/duration-value.vue";
import { useRouter } from "vue-router";
import qrcode from "qrcode";
import * as api from "/@/views/certd/suite/api";
const openRef = ref(false);

const product = ref<any>(null);
const formRef = ref<any>({});
const durationSelected = ref<any>(null);
async function open(opts: OrderModalOpenReq) {
  openRef.value = true;

  product.value = opts.product;

  durationSelected.value = opts.product.durationPrices.find((dp: any) => dp.duration === opts.duration);
  formRef.value.productId = opts.product.id;
  formRef.value.duration = opts.duration;
  formRef.value.num = opts.num ?? 1;
}
const paymentsDictRef = dict({
  async getData() {
    return await GetPaymentTypes();
  },
  onReady: ({ dict }) => {
    if (dict.data.length > 0) {
      formRef.value.payType = dict.data[0].value;
    }
  },
});

const router = useRouter();

async function orderCreate() {
  if (durationSelected.value.price === 0) {
    //如果是0，直接请求创建订单
    await api.TradeCreateFree({
      productId: formRef.value.productId,
      duration: formRef.value.duration,
      num: formRef.value.num ?? 1,
      payType: "free",
    });
    notification.success({
      message: "套餐购买成功",
    });
    openRef.value = false;
    return;
  }

  if (!formRef.value.payType) {
    notification.error({
      message: "请选择支付方式",
    });
    return;
  }
  const paymentReq = await TradeCreate({
    productId: formRef.value.productId,
    duration: formRef.value.duration,
    num: formRef.value.num ?? 1,
    payType: formRef.value.payType,
  });

  async function onPaid() {
    openRef.value = false;
    router.push({
      path: "/",
    });
  }

  //跳转到对应的页面
  // http://pay.docmirror.cn/submit.php
  //易支付表单提交
  if (formRef.value.payType === "yizhifu") {
    doYizhifu(paymentReq);
  } else if (formRef.value.payType === "alipay") {
    //支付宝、
    doAlipay(paymentReq);
  } else if (formRef.value.payType === "wxpay") {
    //微信支付
    doWxpay(paymentReq.qrcode, onPaid);
    return;
  } else {
    notification.error({
      message: "暂不支持该支付方式",
    });
    return;
  }

  Modal.confirm({
    title: "请在新页面完成支付",
    content: "是否确认已完成支付",
    onOk: async () => {
      onPaid();
    },
    cancelText: "取消支付",
    okText: "已完成支付",
  });
}

function doAlipay(paymentReq: any) {
  window.open(paymentReq.url);
}

async function doWxpay(qrcodeText: string, onPaid: () => Promise<void>) {
  //展示微信支付二维码
  const imageUrl = await qrcode.toDataURL(qrcodeText);

  Modal.confirm({
    wrapClassName: "modal-confirm-center",
    title: "请微信扫码支付",
    okText: "已完成支付",
    cancelText: "取消支付",
    icon() {
      return "";
    },
    content: () => {
      return (
        <div style="text-align: center;">
          <img src={imageUrl} style="width: 200px;height: 200px;display: initial;" />
        </div>
      );
    },
    async onOk() {
      await onPaid();
    },
  });
}

function doYizhifu(paymentReq: any) {
  console.log("doYizhifu", paymentReq);
  /**
   * 商户ID	pid	是	Int	1001
   * 支付方式	type	否	String	alipay	支付方式列表
   * 商户订单号	out_trade_no	是	String	20160806151343349
   * 异步通知地址	notify_url	是	String	http://www.pay.com/notify_url.php	服务器异步通知地址
   * 跳转通知地址	return_url	是	String	http://www.pay.com/return_url.php	页面跳转通知地址
   * 商品名称	name	是	String	VIP会员	如超过127个字节会自动截取
   * 商品金额	money	是	String	1.00	单位：元，最大2位小数
   * 业务扩展参数	param	否	String	没有请留空	支付后原样返回
   * 签名字符串	sign	是	String	202cb962ac59075b964b07152d234b70	签名算法点此查看
   * 签名类型	sign_type	是	String	MD5	默认为MD5
   */
  const form = document.createElement("form");
  form.action = paymentReq.url;
  form.method = "post";
  form.target = "_blank";
  // form.style.display = "none";
  document.body.appendChild(form);

  function createInput(name: string, value: any) {
    const input = document.createElement("input");
    input.type = "input";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  const body = paymentReq.body;
  const keys = Object.keys(body);
  keys.forEach(key => {
    createInput(key, body[key]);
  });

  form.submit();
  //delete form
  document.body.removeChild(form);
}

defineExpose({
  open,
});
</script>
<style lang="less">
.order-box {
  .label {
    width: 80px;
    text-align: right;
    margin-right: 5px;
    color: #686868;
    flex: none;
  }
}

.modal-confirm-center {
  .ant-modal-confirm-btns {
    text-align: center;
  }
  .ant-modal-confirm-content {
    margin: 0 !important;
    max-width: 100% !important;
  }
}
</style>
