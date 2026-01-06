import {paymentProviderFactory} from "@certd/commercial-core"
export function registerPaymentProviders() {

  paymentProviderFactory.registerProvider("alipay", async () => (await import("./alipay.js")).PaymentAlipay);
  paymentProviderFactory.registerProvider("wxpay", async () => (await import("./wxpay.js")).PaymentWxpay);
  paymentProviderFactory.registerProvider("yizhifu", async () => (await import("./yizhifu.js")).PaymentYizhifu);
}
