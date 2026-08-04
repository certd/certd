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
            order: 10,
            show: compute(({ row }) => {
              return row.status === "wait_pay";
            }),
            title: "Sync Order Status",
            text: null,
            tooltip: { title: "Sync Order Status" },
            icon: "ant-design:sync-outlined",
            type: "link",
            click: async ({ row }) => {
              Modal.confirm({
                title: "Confirm",
                content: "Confirm syncing order status?",
                onOk: async () => {
                  await api.SyncStatus(row.id);
                  await crudExpose.doRefresh();
                },
              });
            },
          },
          cancel: {
            order: 99,
            show: compute(({ row }) => {
              return row.status === "wait_pay";
            }),
            title: "Cancel Order",
            text: null,
            tooltip: { title: "Cancel Order" },
            icon: "ion:close-circle-outline",
            type: "link",
            danger: true,
            click: async ({ row }) => {
              Modal.confirm({
                title: "Confirm Cancel Order?",
                content: "After cancellation, the order will be closed and frozen balance deductions will be returned automatically.",
                okText: "Confirm Cancellation",
                cancelText: "Think Again",
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
          title: "Order Number",
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
          title: "Product Name",
          type: "text",
          search: { show: true },
          column: {
            width: 150,
          },
        },
        duration: {
          title: "Duration",
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
          title: "Amount",
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
          title: "Balance Deduction",
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
          title: "Actual Paid Amount",
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
          title: "Status",
          search: { show: true },
          type: "dict-select",
          dict: dict({
            data: [
              { label: "Pending Payment", value: "wait_pay", color: "warning" },
              { label: "Paid", value: "paid", color: "success" },
              { label: "Closed", value: "closed", color: "error" },
            ],
          }),
          column: {
            width: 100,
            align: "center",
          },
        },
        payType: {
          title: "Payment Method",
          search: { show: true },
          type: "dict-select",
          dict: dict({
            data: [
              { label: "Aggregated Payment", value: "yizhifu" },
              { label: "Alipay", value: "alipay" },
              { label: "WeChat", value: "wxpay" },
              { label: "Free", value: "free" },
              { label: "Balance Deduction", value: "rebate" },
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
          title: "Payment Time",
          type: "datetime",
          column: {
            width: 160,
          },
        },
        createTime: {
          title: "Created Time",
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
          title: "Updated Time",
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
