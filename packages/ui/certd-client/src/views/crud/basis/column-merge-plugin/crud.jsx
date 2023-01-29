import * as api from "./api";
import { dict } from "@fast-crud/fast-crud";

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

  return {
    output: {},
    crudOptions: {
      settings: {
        viewFormUseCellComponent: true
      },
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest
      },
      columns: {
        id: {
          title: "ID",
          key: "id",
          type: "number",
          column: {
            width: 50
          },
          form: {
            show: false
          }
        },
        text: {
          title: "text",
          type: "text"
        },
        readonly: {
          title: "只读字段",
          type: "text",
          readonly: true
        },
        useCell: {
          title: "查看使用cell组件",
          type: "dict-select",
          readonly: true,
          dict: dict({
            url: "/mock/dicts/OpenStatusEnum"
          }),
          viewForm: {
            component: {
              vModel: "modelValue"
            }
          }
        }
      }
    }
  };
}
