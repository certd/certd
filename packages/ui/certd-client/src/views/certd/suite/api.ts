import { request } from "/@/api/service";
import { dict } from "@fast-crud/fast-crud";
export const durationDict = dict({
  data: [
    { label: "3天", value: 3 },
    { label: "7天", value: 7 },
    { label: "30天", value: 30 },
    { label: "90天", value: 90 },
    { label: "1年", value: 365 },
    { label: "2年", value: 730 },
    { label: "3年", value: 1095 },
    { label: "4年", value: 1460 },
    { label: "5年", value: 1825 },
    { label: "6年", value: 2190 },
    { label: "7年", value: 2555 },
    { label: "8年", value: 2920 },
    { label: "9年", value: 3285 },
    { label: "10年", value: 3650 },
    { label: "永久", value: -1 },
  ],
});

export type OrderModalOpenReq = {
  product: any;
  duration: number;
  num?: number;
};

export async function ProductList() {
  return await request({
    url: "/suite/product/list",
    method: "POST",
  });
}

export async function ProductInfo(productId: number) {
  return await request({
    url: "/suite/product/info",
    method: "POST",
    data: { id: productId },
  });
}

export type TradeCreateReq = {
  productId: number;
  duration: number;
  num: number;
  payType: string;
  useRebateBalance?: boolean;
};

export async function TradeCreate(form: TradeCreateReq) {
  return await request({
    url: "/suite/trade/create",
    method: "POST",
    data: form,
  });
}

export async function TradeCreateFree(form: TradeCreateReq) {
  return await request({
    url: "/suite/trade/createFree",
    method: "POST",
    data: form,
  });
}

export async function GetPaymentTypes() {
  return await request({
    url: "/suite/trade/payments",
    method: "POST",
  });
}

export async function GetSuiteSetting() {
  return await request({
    url: "/suite/settings/get",
    method: "POST",
  });
}

export async function UseActivationCode(code: string) {
  return await request({
    url: "/suite/activation-code/use",
    method: "POST",
    data: { code },
  });
}
