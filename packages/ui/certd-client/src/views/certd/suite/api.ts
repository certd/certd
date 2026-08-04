import { request } from "/@/api/service";
import { dict } from "@fast-crud/fast-crud";
export const durationDict = dict({
  data: [
    { label: "3 days", value: 3 },
    { label: "7 days", value: 7 },
    { label: "30 days", value: 30 },
    { label: "90 days", value: 90 },
    { label: "1 year", value: 365 },
    { label: "2 years", value: 730 },
    { label: "3 years", value: 1095 },
    { label: "4 years", value: 1460 },
    { label: "5 years", value: 1825 },
    { label: "6 years", value: 2190 },
    { label: "7 years", value: 2555 },
    { label: "8 years", value: 2920 },
    { label: "9 years", value: 3285 },
    { label: "10 years", value: 3650 },
    { label: "Permanent", value: -1 },
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
