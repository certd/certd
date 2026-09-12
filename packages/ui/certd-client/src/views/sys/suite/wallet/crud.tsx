import { CreateCrudOptionsProps, CreateCrudOptionsRet, dict, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { notification } from "ant-design-vue";
import { useRouter } from "vue-router";
import { util } from "/@/utils";
import { useFormDialog } from "/@/use/use-dialog";
import createCrudOptionsUser from "/@/views/sys/authority/user/crud";
import PriceInput from "/@/views/sys/suite/product/price-input.vue";
import * as api from "./api";

export default function ({ crudExpose }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { openFormDialog } = useFormDialog();
  const router = useRouter();

  const userDict = dict({
    async getNodesByValues(ids: number[]) {
      return await api.GetSimpleUserByIds(ids);
    },
    value: "id",
    label: "nickName",
  });

  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetList(query);
  };

  function moneyColumn(title: string) {
    return {
      title,
      type: "number",
      column: {
        width: 120,
        component: {
          name: PriceInput,
          vModel: "modelValue",
          edit: false,
        },
      },
    };
  }

  async function openRecharge(userId?: number) {
    await openFormDialog({
      title: "用户余额充值",
      wrapper: { width: 520 },
      initialForm: {
        userId: userId ?? null,
        amountYuan: null,
        remark: "",
      },
      columns: {
        userId: {
          title: "用户",
          type: "table-select",
          dict: userDict,
          form: {
            col: { span: 24 },
            rules: [{ required: true, message: "请选择用户" }],
            component: {
              disabled: userId != null,
              crossPage: true,
              multiple: false,
              select: {
                placeholder: "请选择用户",
              },
              createCrudOptions: createCrudOptionsUser,
            },
          },
        },
        amountYuan: {
          title: "充值金额",
          type: "number",
          form: {
            col: { span: 24 },
            rules: [{ required: true, message: "请输入充值金额" }],
            component: {
              name: "a-input-number",
              vModel: "value",
              min: 0,
              precision: 2,
              addonAfter: "元",
              style: { width: "100%" },
            },
          },
        },
        remark: {
          title: "备注",
          type: "text",
          form: {
            col: { span: 24 },
            helper: "选填",
          },
        },
      },
      async onSubmit(form: any) {
        await api.Recharge({
          userId: form.userId,
          amount: util.amount.toCent(form.amountYuan || 0),
          remark: form.remark,
        });
        await crudExpose.doRefresh();
        notification.success({ message: "充值成功" });
      },
    });
  }

  return {
    crudOptions: {
      request: {
        pageRequest,
      },
      toolbar: { show: false },
      actionbar: {
        buttons: {
          add: { show: false },
          recharge: {
            text: "余额充值",
            type: "primary",
            click: () => openRecharge(),
          },
          log: {
            text: "余额变更记录",
            type: "primary",
            click: () => router.push("/sys/suite/wallet-log"),
          },
        },
      },
      rowHandle: {
        width: 220,
        fixed: "right",
        buttons: {
          view: { show: false },
          edit: { show: false },
          copy: { show: false },
          remove: { show: false },
          walletLog: {
            text: "余额变更记录",
            type: "link",
            click: ({ row }) => router.push({ path: "/sys/suite/wallet-log", query: { userId: row.userId } }),
          },
          recharge: {
            text: "充值",
            type: "link",
            click: ({ row }) => openRecharge(row.userId),
          },
        },
      },
      columns: {
        id: {
          title: "ID",
          type: "number",
          column: { width: 80 },
          form: { show: false },
        },
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
              select: {
                placeholder: "点击选择用户",
              },
              createCrudOptions: createCrudOptionsUser,
            },
          },
        },
        availableAmount: moneyColumn("可用余额"),
        totalAmount: moneyColumn("总余额"),
        frozenAmount: moneyColumn("冻结余额"),
        totalIncomeAmount: moneyColumn("累计收入"),
        totalConsumedAmount: moneyColumn("累计消费"),
        totalWithdrawAmount: moneyColumn("累计提现"),
        createTime: {
          title: "创建时间",
          type: "datetime",
          form: { show: false },
          column: { sorter: true, width: 160 },
        },
        updateTime: {
          title: "更新时间",
          type: "datetime",
          form: { show: false },
          column: { width: 160 },
        },
      },
    },
  };
}
