import { compute, CreateCrudOptionsProps, CreateCrudOptionsRet, dict, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { notification } from "ant-design-vue";
import * as api from "./api";
import PriceInput from "/@/views/sys/suite/product/price-input.vue";
import { useFormDialog } from "/@/use/use-dialog";
import { useUserStore } from "/@/store/user";
import createCrudOptionsUser from "/@/views/sys/authority/user/crud";

function buildPrivateFileUrl(key: string) {
  const userStore = useUserStore();
  return `/api/basic/file/download?token=${userStore.getToken}&key=${encodeURIComponent(key)}`;
}

export default function ({ crudExpose }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { openFormDialog } = useFormDialog();
  const userDict = dict({
    async getNodesByValues(ids: number[]) {
      return await api.GetSimpleUserByIds(ids);
    },
    value: "id",
    label: "nickName",
  });

  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetWithdraws(query);
  };

  function renderWithdrawDetail(row: any) {
    const isBank = row.channel === "bank";
    return (
      <a-descriptions class={"w-full"} bordered column={1} size={"small"}>
        <a-descriptions-item label="提现金额">
          <span class={"text-red-500"}>{row.amount / 100} 元</span>
        </a-descriptions-item>
        <a-descriptions-item label="渠道类型">{row.channel === "bank" ? "银行卡" : "支付宝"}</a-descriptions-item>
        <a-descriptions-item label="用户ID">{row.userId}</a-descriptions-item>
        <a-descriptions-item label="账号">{row.account || "-"}</a-descriptions-item>
        {isBank ? <a-descriptions-item label="开户行名称">{row.bankName || "-"}</a-descriptions-item> : null}
        {!isBank ? <a-descriptions-item label="收款二维码">{row.qrCode ? <a-image src={buildPrivateFileUrl(row.qrCode)} width={160} /> : <span>-</span>}</a-descriptions-item> : null}
      </a-descriptions>
    );
  }

  async function approve(row: any) {
    await openFormDialog({
      title: "提现审核",
      wrapper: {
        width: 760,
        buttons: {
          ok: {
            text: "确认已转账完成",
          },
        },
      },
      body: () => renderWithdrawDetail(row),
      onSubmit: async () => {
        await api.ApproveWithdraw(row.id);
        await crudExpose.doRefresh();
        notification.success({ message: "已审核通过" });
      },
    });
  }

  async function reject(row: any) {
    await openFormDialog({
      title: "提现审核",
      wrapper: {
        width: 760,
      },
      initialForm: {
        remark: "",
      },
      body: () => renderWithdrawDetail(row),
      columns: {
        remark: {
          title: "拒绝理由",
          type: "textarea",
          form: {
            col: {
              span: 24,
            },
            component: {
              name: "a-textarea",
              vModel: "value",
              rows: 4,
              placeholder: "请填写拒绝理由",
            },
            rules: [{ required: true, message: "请填写拒绝理由" }],
          },
        },
      },
      async onSubmit(form: any) {
        const remark = form.remark.trim();
        if (!remark) {
          notification.error({ message: "请填写拒绝理由" });
          throw new Error("请填写拒绝理由");
        }
        await api.RejectWithdraw(row.id, remark);
        await crudExpose.doRefresh();
        notification.success({ message: "已拒绝并退回余额" });
      },
    });
  }

  return {
    crudOptions: {
      request: { pageRequest },
      actionbar: { show: false },
      toolbar: { show: false },
      rowHandle: {
        width: 150,
        fixed: "right",
        buttons: {
          view: { show: false },
          edit: { show: false },
          copy: { show: false },
          remove: { show: false },
          approve: {
            text: "通过",
            type: "link",
            show: compute(({ row }) => row.status === "pending"),
            click: ({ row }) => approve(row),
          },
          reject: {
            text: "拒绝",
            type: "link",
            show: compute(({ row }) => row.status === "pending"),
            click: ({ row }) => reject(row),
          },
        },
      },
      columns: {
        createTime: { title: "申请时间", type: "datetime", column: { width: 180 } },
        userId: {
          title: "用户",
          type: "table-select",
          search: { show: true },
          dict: userDict,
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
        amount: {
          title: "金额",
          type: "number",
          column: {
            width: 120,
            component: { name: PriceInput, vModel: "modelValue", edit: false },
          },
        },
        status: {
          title: "状态",
          type: "dict-select",
          search: { show: true },
          dict: dict({
            data: [
              { label: "待审核", value: "pending", color: "warning" },
              { label: "已通过", value: "approved", color: "success" },
              { label: "已拒绝", value: "rejected", color: "error" },
            ],
          }),
          column: { width: 110 },
        },
        channel: {
          title: "提现渠道",
          type: "dict-select",
          search: { show: true },
          dict: dict({
            data: [
              { label: "支付宝", value: "alipay" },
              { label: "银行卡", value: "bank" },
            ],
          }),
          column: { width: 110 },
        },
        realName: { title: "真实姓名", type: "text", search: { show: true }, column: { width: 120 } },
        account: { title: "收款账号", type: "text", column: { width: 180 } },
        bankName: {
          title: "开户银行",
          type: "text",
          column: {
            width: 160,
            cellRender({ row, value }) {
              if (row.channel !== "bank") {
                return "-";
              }
              return value || "-";
            },
          },
        },
        auditRemark: { title: "审核备注", type: "text", column: { minWidth: 180 } },
      },
    },
  };
}
