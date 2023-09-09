import * as api from "./api";
import * as textTableApi from "../text/api";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import createCrudOptionsText from "../text/crud";
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
        single: {
          title: "单选",
          search: { show: true },
          type: "table-select",
          dict: dict({
            value: "id",
            label: "name",
            getNodesByValues: async (values: any[]) => {
              return await textTableApi.GetByIds(values);
            }
          }),
          form: {
            component: {
              createCrudOptions: createCrudOptionsText,
              crudOptionsOverride: {
                table: {
                  scroll: {
                    x: 2000
                  }
                },
                rowHandle: {
                  fixed: "right"
                }
              }
            }
          }
        },
        multi: {
          title: "多选",
          search: { show: true },
          type: "table-select",
          dict: dict({
            value: "id",
            label: "name",
            getNodesByValues: async (values: any[]) => {
              return await textTableApi.GetByIds(values);
            }
          }),
          form: {
            component: {
              multiple: true,
              createCrudOptions: createCrudOptionsText,
              crudOptionsOverride: {
                table: {
                  scroll: {
                    x: 2000
                  }
                },
                rowHandle: {
                  fixed: "right"
                }
              }
            }
          }
        }
      }
    }
  };
}
