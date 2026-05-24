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
        amount: {
          title: "收益金额",
          type: "number",
          column: {
            width: 120,
            component: { name: PriceInput, vModel: "modelValue", edit: false },
          },
        },
        simpleUser: {
          title: "被推广用户",
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
          title: "推广金额",
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
