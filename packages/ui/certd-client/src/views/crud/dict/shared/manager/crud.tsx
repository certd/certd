import * as api from "./api";
import { statusDict } from "../shared-dict";
export default function ({ crudExpose }) {
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
      pagination: {
        pageSize: 9999
      },
      table: {
        onRefreshed({ data }) {
          statusDict.setData(data);
        }
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
        name: {
          title: "name",
          type: "text"
        },
        label: {
          title: "标签",
          type: "text"
        }
      }
    }
  };
}
