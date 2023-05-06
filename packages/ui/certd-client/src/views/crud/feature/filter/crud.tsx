import * as api from "./api";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";

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
      table: {
        // 表头过滤改变事件
        onFilterChange(filters: any) {
          console.log("onFilterChange", filters);
          if (filters.remote != null) {
            crudExpose.setSearchFormData({
              form: {
                remote: filters.remote
              }
            });
            crudExpose.doRefresh();
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
          title: "本地过滤",
          search: { show: true },
          type: "dict-radio",
          dict: dict({
            url: "/mock/dicts/OpenStatusEnum?single"
          }),
          column: {
            filters: [
              { text: "开", value: "1" },
              { text: "关", value: "0" },
              { text: "停", value: "2" }
            ],
            // specify the condition of filtering result
            // here is that finding the name started with `value`
            onFilter: (value: any, record: any) => {
              return record.radio === value;
            },
            sorter: (a: any, b: any) => a.radio - b.radio,
            sortDirections: ["descend"]
          }
        },
        remote: {
          title: "支持服务端过滤",
          search: {
            show: true,
            component: {
              mode: "multiple"
            }
          },
          type: "dict-radio",
          dict: dict({
            url: "/mock/dicts/OpenStatusEnum?single"
          }),
          column: {
            filters: [
              { text: "开", value: "1" },
              { text: "关", value: "0" },
              { text: "停", value: "2" }
            ]
          }
        }
      }
    }
  };
}
