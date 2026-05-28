import * as api from "./api";
import { AddReq, compute, CreateCrudOptionsProps, CreateCrudOptionsRet, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { Modal } from "ant-design-vue";
import PriceInput from "/@/views/sys/suite/product/price-input.vue";
import DurationValue from "/@/views/sys/suite/product/duration-value.vue";

export default function ({ crudExpose }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetList(query);
  };
  const editRequest = async ({ form, row }: EditReq) => {
    form.id = row.id;
    const res = await api.UpdateObj(form);
    return res;
  };
  const addRequest = async ({ form }: AddReq) => {
    const res = await api.AddObj(form);
    return res;
  };

  return {
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
      },
      rowHandle: {
        width: 120,
        fixed: "right",
        buttons: {
          view: { show: false },
          edit: { show: false },
          copy: { show: false },
          remove: { show: false },
          syncStatus: {
            show: compute(({ row }) => {
              return row.status === "wait_pay";
            }),
            title: "同步订单状态",
            text: null,
            tooltip: { title: "同步订单状态" },
            icon: "ant-design:sync-outlined",
            type: "link",
            click: async ({ row }) => {
              Modal.confirm({
                title: "确认",
                content: "确认同步订单状态？",
                onOk: async () => {
                  await api.SyncStatus(row.id);
                  await crudExpose.doRefresh();
                },
              });
            },
          },
          cancel: {
            show: compute(({ row }) => {
              return row.status === "wait_pay";
            }),
            title: "取消订单",
            text: null,
            tooltip: { title: "取消订单" },
            icon: "ion:close-circle-outline",
            type: "link",
            click: async ({ row }) => {
              Modal.confirm({
                title: "确认取消订单？",
                content: "取消后订单会关闭，已冻结的余额抵扣金额将自动退回。",
                okText: "确认取消",
                cancelText: "再想想",
                onOk: async () => {
                  await api.CancelObj(row.id);
                  await crudExpose.doRefresh();
                },
              });
            },
          },
        },
      },
      actionbar: {
        buttons: {
          add: {
            show: false,
          },
        },
      },
      toolbar: { show: false },
      tabs: {
        name: "status",
        show: true,
      },
      columns: {
        id: {
          title: "ID",
          key: "id",
          type: "number",
          column: {
            width: 100,
          },
          form: {
            show: false,
          },
        },
        tradeNo: {
          title: "订单号",
          type: "text",
          search: { show: true },
          form: {
            show: false,
          },
          column: {
            width: 250,
          },
        },
        title: {
          title: "商品名称",
          type: "text",
          search: { show: true },
          column: {
            width: 150,
          },
        },
        duration: {
          title: "时长",
          type: "number",
          column: {
            width: 100,
            component: {
              name: DurationValue,
              vModel: "modelValue",
            },
          },
        },
        amount: {
          title: "金额",
          type: "number",
          column: {
            width: 100,
            component: {
              name: PriceInput,
              vModel: "modelValue",
              edit: false,
            },
          },
        },
        rebateAmount: {
          title: "余额抵扣",
          type: "number",
          column: {
            width: 110,
            component: {
              name: PriceInput,
              vModel: "modelValue",
              edit: false,
            },
          },
        },
        thirdPartyPayAmount: {
          title: "实付金额",
          type: "number",
          column: {
            width: 110,
            component: {
              name: PriceInput,
              vModel: "modelValue",
              edit: false,
            },
          },
        },
        status: {
          title: "状态",
          search: { show: true },
          type: "dict-select",
          dict: dict({
            data: [
              { label: "待支付", value: "wait_pay", color: "warning" },
              { label: "已支付", value: "paid", color: "success" },
              { label: "已关闭", value: "closed", color: "error" },
            ],
          }),
          column: {
            width: 100,
            align: "center",
          },
        },
        payType: {
          title: "支付方式",
          search: { show: true },
          type: "dict-select",
          dict: dict({
            data: [
              { label: "聚合支付", value: "yizhifu" },
              { label: "支付宝", value: "alipay" },
              { label: "微信", value: "wxpay" },
              { label: "免费", value: "free" },
              { label: "余额抵扣", value: "rebate" },
            ],
          }),
          column: {
            width: 100,
            component: {
              color: "auto",
            },
            align: "center",
          },
        },
        payTime: {
          title: "支付时间",
          type: "datetime",
          column: {
            width: 160,
          },
        },
        createTime: {
          title: "创建时间",
          type: "datetime",
          form: {
            show: false,
          },
          column: {
            sorter: true,
            width: 160,
            align: "center",
          },
        },
        updateTime: {
          title: "更新时间",
          type: "datetime",
          form: {
            show: false,
          },
          column: {
            show: true,
            width: 160,
          },
        },
      },
    },
  };
}
