import * as api from "./api";
import { dict } from "@fast-crud/fast-crud";
export default function ({ expose }) {
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
      pagination: {
        showSizeChanger: false, // antdv
        showQuickJumper: false // antdv
      },
      request: {
        pageRequest: api.GetList,
        addRequest,
        editRequest,
        delRequest
      },
      toolbar: {
        compact: false
      },
      rowHandle: {
        width: "230px"
      },
      table: {},
      columns: {
        gradeId: {
          title: "年级Id",
          search: { show: true },
          type: "number",
          column: {
            width: 80,
            align: "center",
            sortable: true
          }
        },
        class: {
          title: "班级",
          search: { show: false },
          type: "text",
          column: {
            sortable: true
          }
        }
      }
    }
  };
}
