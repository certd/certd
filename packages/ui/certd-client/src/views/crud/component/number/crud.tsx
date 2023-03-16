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
              formatter: (value: any) => `${value}%`,
              parser: (value: any) => value.replace("%", "")
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
