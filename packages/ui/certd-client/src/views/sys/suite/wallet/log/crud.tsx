import { CreateCrudOptionsRet, dict, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { useRoute } from "vue-router";
import { util } from "/@/utils";
import createCrudOptionsUser from "/@/views/sys/authority/user/crud";
import * as api from "../api";

function moneyText(amount: number) {
  const yuan = util.amount.toYuan(Math.abs(amount || 0));
  if (amount < 0) {
    return `-¥${yuan}`;
  }
  return `¥${yuan}`;
}

export default function (): CreateCrudOptionsRet {
  const route = useRoute();
  const userIdFromQuery = route.query.userId ? Number(route.query.userId) : undefined;

  const userDict = dict({
    async getNodesByValues(ids: number[]) {
      return await api.GetSimpleUserByIds(ids);
    },
    value: "id",
    label: "nickName",
  });

  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetWalletLogs(query);
  };

  return {
    crudOptions: {
      request: { pageRequest },
      search: {
        initialForm: { userId: userIdFromQuery },
      },
      actionbar: { show: false },
      toolbar: { show: false },
      rowHandle: { show: false },
      columns: {
        createTime: { title: "时间", type: "datetime", column: { width: 180 } },
        userId: {
          title: "用户",
          type: "table-select",
          dict: userDict,
          search: { show: true, col: { span: 3 } },
          column: { width: 160 },
          form: {
            show: false,
            component: {
              crossPage: true,
              multiple: false,
              select: { placeholder: "点击选择用户" },
              createCrudOptions: createCrudOptionsUser,
            },
          },
        },
        type: {
          title: "类型",
          type: "dict-select",
          dict: dict({
            data: [
              { label: "收益入账", value: "income", color: "success" },
              { label: "余额抵扣", value: "consume", color: "default" },
              { label: "提现扣减", value: "withdraw", color: "warning" },
            ],
          }),
          search: { show: true, col: { span: 3 } },
          column: { width: 120 },
        },
        amount: {
          title: "变动金额",
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
          title: "变动后余额",
          type: "number",
          column: {
            width: 130,
            cellRender({ value }) {
              return <span class="text-red-500">{moneyText(Number(value || 0))}</span>;
            },
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
