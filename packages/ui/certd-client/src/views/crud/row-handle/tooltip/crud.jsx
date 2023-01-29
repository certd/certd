import * as api from "./api";
import { dict } from "@fast-crud/fast-crud";
import { ref } from "vue";
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
      rowHandle: {
        width: 400,
        buttons: {
          edit: {
            tooltip: {
              title: "编辑"
            }
          },
          view: {
            tooltip: {
              title: "查看"
            }
          },
          remove: {
            tooltip: {
              title: "删除"
            }
          },
          custom: {
            text: "tooltip title render",
            tooltip: {
              slots: {
                title() {
                  return (
                    <div>
                      <fs-iconify icon={"ion:eye-outline"}></fs-iconify>我是自定义render
                    </div>
                  );
                }
              }
            }
          }
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
        radio: {
          title: "状态",
          search: { show: true },
          type: "dict-radio",
          dict: dict({
            url: "/mock/dicts/OpenStatusEnum?single"
          })
        }
      }
    }
  };
}
