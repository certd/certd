import * as api from "./api";
import { dict } from "@fast-crud/fast-crud";
import { ref } from "vue";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
export default function ({ crudExpose }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetList(query);
  };
  const editRequest = async ({ form, row }: EditReq) => {
    form.id = row.id;
    return await api.UpdateObj(form);
  };
  const delRequest = async ({ row }: DelReq) => {
    return await api.DelObj(row.id);
  };

  const addRequest = async ({ form }: AddReq) => {
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
            },
            click() {
              console.log("test");
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
