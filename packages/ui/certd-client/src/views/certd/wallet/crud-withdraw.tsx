import { CreateCrudOptionsRet, dict, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import * as api from "./api";
import PriceInput from "/@/views/sys/suite/product/price-input.vue";
import { useI18n } from "/src/locales";

export default function (): CreateCrudOptionsRet {
  const { t } = useI18n();
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
        createTime: { title: t("certd.wallet.applyTime"), type: "datetime", column: { width: 180 } },
        amount: {
          title: t("certd.wallet.amount"),
          type: "number",
          column: {
            width: 120,
            component: { name: PriceInput, vModel: "modelValue", edit: false },
          },
        },
        status: {
          title: t("certd.common.status"),
          type: "dict-select",
          dict: dict({
            data: [
              { label: t("certd.wallet.pending"), value: "pending", color: "warning" },
              { label: t("certd.wallet.approved"), value: "approved", color: "success" },
              { label: t("certd.wallet.rejected"), value: "rejected", color: "error" },
            ],
          }),
          column: { width: 110 },
        },
        channel: {
          title: t("certd.wallet.channel"),
          type: "dict-select",
          dict: dict({
            data: [
              { label: t("certd.wallet.alipay"), value: "alipay" },
              { label: t("certd.wallet.bank"), value: "bank" },
            ],
          }),
          column: { width: 110 },
        },
        auditRemark: { title: t("certd.wallet.auditRemark"), type: "text", column: { minWidth: 180 } },
      },
    },
  };
}
