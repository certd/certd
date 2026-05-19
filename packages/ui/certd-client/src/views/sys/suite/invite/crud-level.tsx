import { AddReq, compute, CreateCrudOptionsRet, DelReq, EditReq, UserPageQuery, UserPageRes, dict } from "@fast-crud/fast-crud";
import * as api from "./api";
import PriceInput from "/@/views/sys/suite/product/price-input.vue";

export default function (): CreateCrudOptionsRet {
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetLevels(query);
  };
  const addRequest = async ({ form }: AddReq) => {
    return await api.AddLevel(form);
  };
  const editRequest = async ({ form, row }: EditReq) => {
    form.id = row.id;
    return await api.UpdateLevel(form);
  };
  const delRequest = async ({ row }: DelReq) => {
    row.disabled = true;
    return await api.UpdateLevel(row);
  };

  return {
    crudOptions: {
      request: { pageRequest, addRequest, editRequest, delRequest },
      rowHandle: {
        width: 180,
        fixed: "right",
        buttons: {
          view: { show: false },
          copy: { show: false },
          remove: {
            text: "禁用",
            show: compute(({ row }) => row.disabled !== true),
          },
        },
      },
      columns: {
        id: {
          title: "ID",
          type: "number",
          form: { show: false },
          column: { width: 90 },
        },
        name: {
          title: "等级名称",
          type: "text",
          search: { show: true },
          form: {
            rules: [{ required: true, message: "请输入等级名称" }],
          },
          column: { width: 140 },
        },
        minAmount: {
          title: "升级金额",
          type: "number",
          form: {
            component: { name: PriceInput, vModel: "modelValue", edit: true },
            rules: [{ required: true, message: "请输入升级金额" }],
          },
          column: {
            width: 140,
            component: { name: PriceInput, vModel: "modelValue", edit: false },
          },
        },
        commissionRate: {
          title: "佣金比例",
          type: "number",
          form: {
            component: { min: 0, max: 100, addonAfter: "%" },
            rules: [{ required: true, message: "请输入佣金比例" }],
          },
          column: { width: 110, align: "center", cellRender: ({ value }) => `${value || 0}%` },
        },
        isHidden: {
          title: "隐藏等级",
          type: "dict-switch",
          dict: dict({
            data: [
              { label: "普通等级", value: false, color: "success" },
              { label: "隐藏等级", value: true, color: "warning" },
            ],
          }),
          form: { value: false },
          column: { width: 120, align: "center" },
        },
        sort: {
          title: "排序",
          type: "number",
          form: { value: 10 },
          column: { width: 90, align: "center" },
        },
        disabled: {
          title: "状态",
          type: "dict-switch",
          dict: dict({
            data: [
              { label: "启用", value: false, color: "success" },
              { label: "禁用", value: true, color: "error" },
            ],
          }),
          form: { value: false },
          column: { width: 100, align: "center" },
        },
        createTime: { title: "创建时间", type: "datetime", form: { show: false }, column: { width: 170 } },
        updateTime: { title: "更新时间", type: "datetime", form: { show: false }, column: { width: 170 } },
      },
    },
  };
}
