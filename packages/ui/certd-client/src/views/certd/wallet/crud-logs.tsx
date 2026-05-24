import { CreateCrudOptionsRet, dict, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import * as api from "./api";
import PriceInput from "/@/views/sys/suite/product/price-input.vue";

export default function (): CreateCrudOptionsRet {
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetWalletLogs(query);
  };

  return {
    crudOptions: {
      request: { pageRequest },
      search: { show: false },
      actionbar: { show: false },
      toolbar: { show: false },
      rowHandle: { show: false },
      columns: {
        createTime: { title: "时间", type: "datetime", column: { width: 180 } },
        type: {
          title: "类型",
          type: "dict-select",
          dict: dict({
            data: [
              { label: "收益入账", value: "income", color: "success" },
              { label: "余额抵扣", value: "consume", color: "default" },
              { label: "提现冻结", value: "withdraw_freeze", color: "warning" },
              { label: "提现成功", value: "withdraw_success", color: "success" },
              { label: "提现退回", value: "withdraw_reject", color: "processing" },
            ],
          }),
          column: { width: 120 },
        },
        amount: {
          title: "变动金额",
          type: "number",
          column: {
            width: 120,
            component: { name: PriceInput, vModel: "modelValue", edit: false },
          },
        },
        balanceAfter: {
          title: "变动后余额",
          type: "number",
          column: {
            width: 130,
            component: { name: PriceInput, vModel: "modelValue", edit: false },
          },
        },
        remark: {
          title: "备注",
          type: "text",
          column: { minWidth: 220 },
        },
      },
    },
  };
}
