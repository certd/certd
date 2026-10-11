import { CreateCrudOptionsRet, dict, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import * as api from "./api";
import { util } from "/@/utils";
import { useI18n } from "/src/locales";

function moneyText(amount: number) {
  const yuan = util.amount.toYuan(Math.abs(amount || 0));
  if (amount < 0) {
    return `-¥${yuan}`;
  }
  return `¥${yuan}`;
}

export default function (): CreateCrudOptionsRet {
  const { t } = useI18n();
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
        createTime: { title: t("certd.wallet.applyTime"), type: "datetime", column: { width: 180 } },
        type: {
          title: t("certd.wallet.type"),
          type: "dict-select",
          dict: dict({
            data: [
              { label: t("certd.wallet.income"), value: "income", color: "success" },
              { label: t("certd.wallet.consume"), value: "consume", color: "default" },
              { label: t("certd.wallet.withdrawFreeze"), value: "withdraw_freeze", color: "warning" },
              { label: t("certd.wallet.withdrawSuccess"), value: "withdraw", color: "success" },
              { label: t("certd.wallet.withdrawSuccess"), value: "withdraw_success", color: "success" },
              { label: t("certd.wallet.withdrawReject"), value: "withdraw_reject", color: "processing" },
            ],
          }),
          column: { width: 120 },
        },
        amount: {
          title: t("certd.wallet.changeAmount"),
          type: "number",
          column: {
            width: 120,
            cellRender({ value }) {
              const amount = Number(value || 0);
              return <span class={amount < 0 ? "text-green-500" : "text-red-500"}>{moneyText(amount)}</span>;
            },
          },
        },
        balanceAfter: {
          title: t("certd.wallet.balanceAfter"),
          type: "number",
          column: {
            width: 130,
            cellRender({ value }) {
              return <span class="text-red-500">{moneyText(Number(value || 0))}</span>;
            },
          },
        },
        remark: {
          title: t("certd.wallet.remark"),
          type: "text",
          column: { minWidth: 220 },
        },
      },
    },
  };
}
