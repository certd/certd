import { CreateCrudOptionsRet, dict, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import * as api from "./api";
import PriceInput from "/@/views/sys/suite/product/price-input.vue";

export default function (): CreateCrudOptionsRet {
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
        createTime: { title: "申请时间", type: "datetime", column: { width: 180 } },
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
          dict: dict({
            data: [
              { label: "支付宝", value: "alipay" },
              { label: "银行卡", value: "bank" },
            ],
          }),
          column: { width: 110 },
        },
        realName: { title: "真实姓名", type: "text", column: { width: 120 } },
        account: { title: "收款账号", type: "text", column: { width: 180 } },
        bankName: { title: "开户银行", type: "text", column: { width: 160 } },
        qrCode: {
          title: "收款二维码",
          type: "text",
          column: {
            width: 120,
            cellRender({ value }) {
              if (!value) {
                return "-";
              }
              return <a-image src={`/api/basic/file/download?key=${value}`} width={48} />;
            },
          },
        },
        auditRemark: { title: "审核备注", type: "text", column: { minWidth: 180 } },
      },
    },
  };
}
