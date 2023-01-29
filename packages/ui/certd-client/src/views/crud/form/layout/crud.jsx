import * as api from "./api";
import { dict, compute } from "@fast-crud/fast-crud";
export default function ({ expose }) {
  const pageRequest = async (query) => {
    return await api.GetList(query);
  };
  const editRequest = async ({ form, row }) => {
    form.id = row.id;
    return await api.UpdateObj(form);
  };
  const delRequest = async ({ row }) => {
    return await api.DelObj(row.id);
  };

  const addRequest = async ({ form }) => {
    return await api.AddObj(form);
  };

  const { getFormData, getFormWrapperRef } = expose;
  return {
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest
      },
      form: {
        /**
         * flex模式，通过
         * grid模式
         */
        display: "flex",
        wrapper: {
          customClass: "page-layout",
          onOpened(context) {
            getFormWrapperRef().formOptions.display = context.options.initial?.display;
            console.log("form opened", context, getFormData());
          }
        }
      },
      columns: {
        display: {
          title: "布局",
          type: "dict-radio",
          dict: dict({
            data: [
              { value: "flex", label: "flex", color: "blue" },
              { value: "grid", label: "grid", color: "green" }
            ]
          }),
          search: { show: true, valueChange: null },
          form: {
            valueChange(context) {
              const { value } = context;
              getFormWrapperRef().formOptions.display = value;
              console.log("valueChange", value, context);
            }
          }
        },
        name: {
          title: "姓名",
          type: "text",
          search: { show: true }
        },
        zip: {
          title: "邮编",
          type: "text"
        },
        blank: {
          title: "表单占位栏",
          type: "text",
          form: {
            blank: true
          }
        },
        gridSpan: {
          title: "grid跨列",
          type: "textarea",
          form: {
            col: {
              style: { gridColumn: "span 2" } // grid 模式
            }
          }
        },
        flexSpan: {
          title: "flex跨列",
          type: "textarea",
          search: { show: false },
          form: {
            show: compute((context) => {
              // grid跨列模式下使用flex模式的设置会显示异常，为了演示效果，在grid模式下隐藏
              return context.form.display !== "grid";
            }),
            col: { span: 24 } // flex模式跨列配置
          }
        }
      }
    }
  };
}
