import { CreateCrudOptionsRet, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import * as api from "./api";
import PriceInput from "/@/views/sys/suite/product/price-input.vue";
import { useI18n } from "/src/locales";

export default function (): CreateCrudOptionsRet {
  const { t } = useI18n();
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
          title: t("certd.suite.orderTime"),
          type: "datetime",
          column: { width: 180 },
        },
        amount: {
          title: t("certd.suite.totalIncome"),
          type: "number",
          column: {
            width: 120,
            component: { name: PriceInput, vModel: "modelValue", edit: false },
          },
        },
        simpleUser: {
          title: t("certd.suite.inviteeCount"),
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
          title: t("certd.suite.promotionAmount"),
          type: "number",
          column: {
            width: 120,
            component: { name: PriceInput, vModel: "modelValue", edit: false },
          },
        },
        remark: {
          title: t("certd.common.remark"),
          type: "text",
          column: { minWidth: 220 },
        },
      },
    },
  };
}
