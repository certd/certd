import * as api from "./api";
import { AddReq, compute, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
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
      //将 addRow 按钮启用
      actionbar: { buttons: { add: { show: false }, addRow: { show: true } } },
      table: {
        editable: {
          enabled: true,
          mode: "row",
          activeTrigger: false
        }
      },
      columns: {
        id: {
          title: "ID",
          type: "number",
          form: {
            show: false
          },
          column: { width: 80, align: "center" }
        },
        disable: {
          title: "禁止编辑",
          type: "text",
          column: {
            editable: {
              disabled: true //也可以配置为方法，根据条件禁用或启用编辑
              // disabled: ({ column, index, row }) => {
              //   return index % 2 === 0;
              // }
            }
          }
        },
        radio: {
          title: "状态",
          search: { show: true },
          type: "dict-radio",
          dict: dict({
            url: "/mock/dicts/OpenStatusEnum?single"
          })
        },
        target: {
          title: "根据状态动态显隐",
          search: { show: true },
          type: "text",
          form: {
            conditionalRender: {
              match: ({ form }) => {
                return form.radio === "2";
              },
              render: ({ form }) => {
                return <div>已停止</div>;
              }
            },
            show: compute(({ form }) => {
              return form.radio !== "0";
            })
          }
        },
        name: {
          title: "姓名",
          type: "text"
        },
        address: {
          title: "地址",
          children: {
            province: {
              title: "省份",
              search: { show: true },
              type: "text"
            },
            city: {
              title: "城市",
              search: { show: true },
              type: "dict-select",
              dict: dict({
                value: "id",
                label: "text",
                data: [
                  { id: "sz", text: "深圳", color: "success" },
                  { id: "gz", text: "广州", color: "primary" },
                  { id: "bj", text: "北京" },
                  { id: "wh", text: "武汉" },
                  { id: "sh", text: "上海" }
                ]
              })
            }
          }
        }
      }
    }
  };
}
