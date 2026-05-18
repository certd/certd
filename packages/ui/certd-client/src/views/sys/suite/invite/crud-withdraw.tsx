import { compute, CreateCrudOptionsProps, CreateCrudOptionsRet, dict, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { Modal, notification } from "ant-design-vue";
import * as api from "./api";
import PriceInput from "/@/views/sys/suite/product/price-input.vue";
import { useFormDialog } from "/@/use/use-dialog";

export default function ({ crudExpose }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { openFormDialog } = useFormDialog();

  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetWithdraws(query);
  };

  async function approve(row: any) {
    Modal.confirm({
      title: "确认提现已线下打款？",
      async onOk() {
        await api.ApproveWithdraw(row.id);
        await crudExpose.doRefresh();
        notification.success({ message: "已审核通过" });
      },
    });
  }

  async function reject(row: any) {
    await openFormDialog({
      title: "拒绝提现申请",
      wrapper: {
        width: 520,
      },
      initialForm: {
        remark: "",
      },
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
        userId: { title: "用户ID", type: "number", search: { show: true }, column: { width: 100 } },
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
        bankName: { title: "开户银行", type: "text", column: { width: 160 } },
        auditRemark: { title: "审核备注", type: "text", column: { minWidth: 180 } },
        createTime: { title: "申请时间", type: "datetime", column: { width: 180 } },
      },
    },
  };
}
