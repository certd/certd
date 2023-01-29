import * as api from "./api";
import { dict } from "@fast-crud/fast-crud";
import dayjs from "dayjs";
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
  const radioDict = dict({
    url: "/mock/dicts/OpenStatusEnum?single"
  });
  return {
    radioDict,
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest
      },
      rowHandle: {
        buttons: {
          edit: { dropdown: true },
          remove: { dropdown: true }
        },
        width: 630
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
        like: {
          title: "like",
          type: "number",
          search: { show: true }
        },
        switch: {
          title: "switch",
          type: "dict-switch",
          dict: dict({
            data: [
              { value: true, label: "开启" },
              { value: false, label: "关闭" }
            ]
          })
        },
        createDate: {
          title: "时间",
          type: "datetime",
          column: {
            align: "left",
            width: 300
          },
          valueBuilder({ key, row }) {
            row[key] = dayjs(row[key]);
          }
        },
        updateDate: {
          title: "修改时间",
          type: "datetime",
          column: {
            show: false
          },
          valueBuilder({ key, row }) {
            row[key] = dayjs(row[key]);
          }
        }
      }
    }
  };
}
