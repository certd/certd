import * as api from "./api";
import { requestForMock } from "/src/api/service";
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
    crudOptions: {
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
        integer: {
          title: "整数",
          search: { show: true },
          type: "number"
        },
        float: {
          title: "小数",
          type: "number",
          form: {
            component: {
              step: "0.1"
            }
          }
        },
        format: {
          title: "格式化",
          type: "number",
          form: {
            component: {
              formatter: (value) => `${value}%`,
              parser: (value) => value.replace("%", "")
            }
          },
          column: {
            formatter({ value }) {
              return value + "%";
            }
          }
        }
      }
    }
  };
}
