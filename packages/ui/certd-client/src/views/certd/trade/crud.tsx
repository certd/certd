import * as api from "./api";
import { useI18n } from "/src/locales";
import { computed, Ref, ref } from "vue";
import { useRouter } from "vue-router";
import { AddReq, compute, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes, utils } from "@fast-crud/fast-crud";
import { useUserStore } from "/@/store/user";
import { useSettingStore } from "/@/store/settings";
import { Modal } from "ant-design-vue";
import PriceInput from "/@/views/sys/suite/product/price-input.vue";
import SuiteValue from "/@/views/sys/suite/product/suite-value.vue";
import DurationValue from "/@/views/sys/suite/product/duration-value.vue";

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const router = useRouter();
  const { t } = useI18n();
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetList(query);
  };
  const editRequest = async ({ form, row }: EditReq) => {
    form.id = row.id;
    const res = await api.UpdateObj(form);
    return res;
  };
  const delRequest = async ({ row }: DelReq) => {
    return await api.DelObj(row.id);
  };

  const addRequest = async ({ form }: AddReq) => {
    const res = await api.AddObj(form);
    return res;
  };

  const userStore = useUserStore();
  const settingStore = useSettingStore();
  const selectedRowKeys: Ref<any[]> = ref([]);
  context.selectedRowKeys = selectedRowKeys;

  return {
    crudOptions: {
      settings: {
        plugins: {
          //这里使用行选择插件，生成行选择crudOptions配置，最终会与crudOptions合并
          rowSelection: {
            enabled: true,
            order: -2,
            before: true,
            // handle: (pluginProps,useCrudProps)=>CrudOptions,
            props: {
              multiple: true,
              crossPage: true,
              selectedRowKeys,
            },
          },
        },
      },
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest,
      },
      rowHandle: {
        width: 240,
        fixed: "right",
        buttons: {
          view: { show: false },
          edit: { show: false },
          copy: { show: false },
          syncStatus: {
            show: compute(({ row }) => {
              return row.status === "wait_pay";
            }),
            text: "同步订单状态",
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
          title: "返利抵扣",
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
              { label: "返利余额", value: "rebate" },
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
