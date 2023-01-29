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
      form: {
        // 单列布局
        col: { span: 24 },
        labelCol: { span: 4 },
        wrapperCol: { span: 18 }
      },
      rowHandle: {
        fixed: "right"
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

        statusRemote: {
          title: "单选远程",
          search: {
            show: true,
            value: []
          },
          type: "dict-select",
          dict: dict({
            url: "/mock/dicts/_OpenStatusEnum2?simple",
            value: "id",
            label: "text"
          }),
          form: {
            component: { mode: "multiple" },
            rules: [{ required: true, message: "请选择一个选项" }]
          },
          column: {
            width: 200
          }
        },
        id2: {
          title: "ID",
          key: "id",
          type: "number",
          column: {
            width: 300
          },
          form: {
            show: false
          }
        },
        id3: {
          title: "ID",
          key: "id",
          type: "number",
          column: {
            width: 300
          },
          form: {
            show: false
          }
        },
        id4: {
          title: "ID",
          key: "id",
          type: "number",
          column: {
            width: 300
          },
          form: {
            show: false
          }
        }
      }
    }
  };
}
