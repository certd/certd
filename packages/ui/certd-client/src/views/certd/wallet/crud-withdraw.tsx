import { CreateCrudOptionsRet, dict, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import * as api from "./api";
import PriceInput from "/@/views/sys/suite/product/price-input.vue";

export default function (): CreateCrudOptionsRet {
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetWithdraws(query);
  };

  return {
    crudOptions: {
      request: { pageRequest },
      search: { show: false },
      actionbar: { show: false },
      toolbar: { show: false },
      rowHandle: { show: false },
      columns: {
        createTime: { title: "Application Time", type: "datetime", column: { width: 180 } },
        amount: {
          title: "Amount",
          type: "number",
          column: {
            width: 120,
            component: { name: PriceInput, vModel: "modelValue", edit: false },
          },
        },
        status: {
          title: "Status",
          type: "dict-select",
          dict: dict({
            data: [
              { label: "Pending Review", value: "pending", color: "warning" },
              { label: "Approved", value: "approved", color: "success" },
              { label: "Rejected", value: "rejected", color: "error" },
            ],
          }),
          column: { width: 110 },
        },
        channel: {
          title: "Withdrawal Channel",
          type: "dict-select",
          dict: dict({
            data: [
              { label: "Alipay", value: "alipay" },
              { label: "Bank Card", value: "bank" },
            ],
          }),
          column: { width: 110 },
        },
        auditRemark: { title: "Audit Remarks", type: "text", column: { minWidth: 180 } },
      },
    },
  };
}
