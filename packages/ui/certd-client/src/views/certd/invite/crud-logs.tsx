import { CreateCrudOptionsRet, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import * as api from "./api";
import PriceInput from "/@/views/sys/suite/product/price-input.vue";

export default function (): CreateCrudOptionsRet {
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetCommissionLogs(query);
  };

  return {
    crudOptions: {
      request: { pageRequest },
      search: { show: false },
      actionbar: { show: false },
      toolbar: { show: false },
      rowHandle: { show: false },
      columns: {
        createTime: {
          title: "Time",
          type: "datetime",
          column: { width: 180 },
        },
        amount: {
          title: "Earnings Amount",
          type: "number",
          column: {
            width: 120,
            component: { name: PriceInput, vModel: "modelValue", edit: false },
          },
        },
        simpleUser: {
          title: "Referred User",
          type: "text",
          column: {
            width: 170,
            cellRender({ row }) {
              const simpleUser = row.simpleUser;
              if (!simpleUser) {
                return "-";
              }
              return (
                <div class="leading-5">
                  <div>
                    {simpleUser.username || "-"} ({simpleUser.id})
                  </div>
                </div>
              );
            },
          },
        },
        consumeAmount: {
          title: "Referral Amount",
          type: "number",
          column: {
            width: 120,
            component: { name: PriceInput, vModel: "modelValue", edit: false },
          },
        },
        remark: {
          title: "Remarks",
          type: "text",
          column: { minWidth: 220 },
        },
      },
    },
  };
}
