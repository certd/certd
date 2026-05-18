import { CreateCrudOptionsRet, dict, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import * as api from "./api";
import PriceInput from "/@/views/sys/suite/product/price-input.vue";

export default function (): CreateCrudOptionsRet {
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetCommissionLogs(query);
  };

  return {
    crudOptions: {
      request: { pageRequest },
      actionbar: { show: false },
      toolbar: { show: false },
      rowHandle: { show: false },
      columns: {
        type: {
          title: "类型",
          type: "dict-select",
          dict: dict({
            data: [{ label: "佣金入账", value: "commission", color: "success" }],
          }),
          column: { width: 130 },
        },
        amount: {
          title: "金额",
          type: "number",
          column: {
            width: 120,
            component: { name: PriceInput, vModel: "modelValue", edit: false },
          },
        },
        inviteeUserDisplay: {
          title: "被邀请用户",
          type: "text",
          column: { width: 150 },
        },
        consumeAmount: {
          title: "消费金额",
          type: "number",
          column: {
            width: 120,
            component: { name: PriceInput, vModel: "modelValue", edit: false },
          },
        },
        remark: {
          title: "备注",
          type: "text",
          column: { minWidth: 220 },
        },
        createTime: {
          title: "时间",
          type: "datetime",
          column: { width: 180 },
        },
      },
    },
  };
}
