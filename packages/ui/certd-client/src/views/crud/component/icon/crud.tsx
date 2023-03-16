import * as api from "./api";
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
        icon: {
          title: "icon",
          search: { show: true },
          type: "text",
          column: {
            component: {
              name: "fs-icon",
              vModel: "icon",
              style: "font-size:18px"
            }
          },
          form: {
            helper: {
              render() {
                return (
                  <a target={"_blank"} href={"https://iconify.design/icon-sets/ion/"}>
                    点击此处选择图标名称
                  </a>
                );
              }
            }
          }
        },
        svg: {
          title: "svg",
          search: { show: true },
          type: "text",
          column: {
            component: {
              name: "fs-icon",
              vModel: "icon",
              style: "font-size:18px"
            }
          }
        }
      }
    }
  };
}
