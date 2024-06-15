import { AddReq, compute, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery } from "@fast-crud/fast-crud";
import * as api from "./api";
import { TsTestRow } from "./api";

/**
 * 定义context参数类型
 */
export type TsTestContext = {
  test?: number;
};
export default function ({ crudExpose, context }: CreateCrudOptionsProps<TsTestRow, TsTestContext>): CreateCrudOptionsRet<TsTestRow> {
  context.test = 111;
  return {
    crudOptions: {
      // 自定义crudOptions配置
      columns: {
        name: {
          title: "姓名",
          type: "text",
          search: { show: true },
          column: {
            resizable: true,
            width: 200
          }
        },
        type: {
          title: "类型",
          type: "dict-select",
          dict: dict({
            data: [
              { value: 1, label: "开始", color: "green" },
              { value: 0, label: "停止", color: "red" }
            ]
          }),
          valueResolve: ({ form }) => {
            console.log("valueResolve", form.type);
          },
          valueBuilder: ({ row }) => {
            console.log("valueBuilder", row.type);
          }
        },
        compute: {
          title: "compute",
          type: "text",
          form: {
            component: {
              show: compute(({ form }) => {
                //自动带form ts提示
                return form.type === 1;
              }),
              disabled: compute<boolean, TsTestRow>(({ form }) => {
                //disabled属性 不在component配置的定义中，所有不带row、form的ts提示, 需要手动指定类型
                return form.type === 1;
              })
            }
          }
        }
      },
      //两个字段
      request: {
        pageRequest: async (query: UserPageQuery) => {
          return await api.GetList(query);
        },
        addRequest: async ({ form }: AddReq) => {
          return await api.AddObj(form);
        },
        editRequest: async ({ form, row }: EditReq) => {
          if (form.id == null) {
            form.id = row.id;
          }
          return await api.UpdateObj(form);
        },
        delRequest: async ({ row }: DelReq) => {
          return await api.DelObj(row.id);
        }
      }
    }
  };
}
