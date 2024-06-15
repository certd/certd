import * as api from "./api";
import { AddReq, compute, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes, utils } from "@fast-crud/fast-crud";
import { computed, Ref, ref } from "vue";
import dayjs from "dayjs";
export default function ({ crudExpose }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetList(query);
  };
  const editRequest = async ({ form, row }: EditReq) => {
    if (form.id == null) {
      form.id = row.id;
    }
    return await api.UpdateObj(form);
  };
  const delRequest = async ({ row }: DelReq) => {
    return await api.DelObj(row.id);
  };

  const addRequest = async ({ form }: AddReq) => {
    return await api.AddObj(form);
  };

  const options: Ref = ref([]);

  return {
    crudOptions: {
      table: {},
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest
      },
      toolbar: {},
      rowHandle: {
        buttons: {
          edit: { show: true }
        }
      },
      form: {
        watch({ form }) {
          form.totalAmount = form.users * form.months * form.licensePrice;
          form.statementAmount = form.totalAmount - form.discountAmount;
          form.statementPrice = form.statementAmount / form.months / form.users;
          if (form.months && form.startTime) {
            // form.endTime = dayjs(form.startTime).add(form.months, "month");
          }
        }
      },
      columns: {
        id: {
          title: "ID",
          type: "text",
          form: { show: false },
          column: { show: false }
        },
        users: {
          title: "用户数量",
          type: "number",
          column: { width: 120 },
          form: {
            component: { min: 1, max: 10000 },
            rules: [{ required: true, message: "用户数量不能为空" }]
          }
        },
        months: {
          title: "月数",
          type: "number",
          column: { width: 100 },
          form: {
            component: { min: 1, max: 120 },
            rules: [{ required: true, message: "采购月数不能为空" }]
          }
        },
        licensePrice: {
          title: "单用户价",
          type: "number",
          column: { width: 150 },
          form: {
            component: { min: 1, max: 99999 },
            helper: "单个用户许可价格"
          }
        },
        totalAmount: {
          title: "总额",
          type: "number",
          search: { show: false },
          column: { width: 150 },
          form: {
            component: { disabled: true }
          }
        },
        discountAmount: {
          title: "优惠",
          type: "number",
          column: { width: 150 },
          addForm: {
            value: 0
          },
          form: {
            component: { min: 0, max: 9999999 },
            rules: [{ required: true, message: "优惠金额不能为空" }]
          }
        },
        statementAmount: {
          title: "结算金额",
          type: "number",
          search: { show: false },
          column: { width: 150 },
          form: {
            component: { disabled: true },
            rules: [{ required: true, message: "结算金额不能为空" }],
            helper: "结算金额 = 总额 - 优惠金额"
          }
        },
        statementPrice: {
          title: "结算单价",
          type: "number",
          column: { width: 150 },
          form: {
            component: { disabled: true },
            helper: "结算单价 = 结算金额 / 月份 / 用户数"
          }
        },
        startTime: {
          title: "开始时间",
          type: "date",
          valueBuilder({ value, row, key }) {
            if (value != null) {
              row[key] = dayjs.unix(value);
            }
          },
          valueResolve({ value, row, key }) {
            if (value != null) {
              row[key] = dayjs(value).unix();
            }
          },
          form: {
            rules: [{ required: true, message: "订阅起始日期不能为空" }],
            component: {
              format: "YYYY-MM-DD"
            }
          }
        },
        endTime: {
          title: "结束时间",
          type: "date",
          valueResolve({ value, row, key }) {
            if (value != null) {
              row[key] = dayjs(value).unix();
            }
          },
          form: {
            component: {
              format: "YYYY-MM-DD",
              disabled: true
            },
            rules: [{ required: true, message: "订阅结束日期不能为空" }],
            helper: "结束日期 = 开始日期 + 采购月份"
          }
        },
        paymentStatus: {
          title: "状态",
          type: "dict-select",
          column: { width: 100, align: "center" },
          search: { show: true },
          dict: dict({
            data: [
              { value: "0", label: "待支付", color: "error" },
              { value: "10", label: "部分支付", color: "warning" },
              { value: "20", label: "已支付", color: "success" }
            ]
          }),
          form: {
            rules: [{ required: true, message: "支付状态不能为空" }]
          }
        },
        description: {
          title: "产品描述",
          column: { show: false },
          type: ["textarea"],
          form: {
            rules: [{ required: true, message: "描述不能为空" }],
            col: {
              span: 24
            }
          }
        }
      }
    }
  };
}
