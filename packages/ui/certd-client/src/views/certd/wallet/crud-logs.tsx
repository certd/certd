import { CreateCrudOptionsRet, dict, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import * as api from "./api";
import { util } from "/@/utils";

function moneyText(amount: number) {
  const yuan = util.amount.toYuan(Math.abs(amount || 0));
  if (amount < 0) {
    return `-¥${yuan}`;
  }
  return `¥${yuan}`;
}

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
        createTime: { title: "Time", type: "datetime", column: { width: 180 } },
        type: {
          title: "Type",
          type: "dict-select",
          dict: dict({
            data: [
              { label: "Earnings Credit", value: "income", color: "success" },
              { label: "Balance Deduction", value: "consume", color: "default" },
              { label: "Withdrawal Frozen", value: "withdraw_freeze", color: "warning" },
              { label: "Withdrawal Successful", value: "withdraw", color: "success" },
              { label: "Withdrawal Successful", value: "withdraw_success", color: "success" },
              { label: "Withdrawal Returned", value: "withdraw_reject", color: "processing" },
            ],
          }),
          column: { width: 120 },
        },
        amount: {
          title: "Change Amount",
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
          title: "Balance After Change",
          type: "number",
          column: {
            width: 130,
            cellRender({ value }) {
              return <span class="text-red-500">{moneyText(Number(value || 0))}</span>;
            },
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
