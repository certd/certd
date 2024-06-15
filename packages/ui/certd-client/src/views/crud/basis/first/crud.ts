import { AddReq, compute, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery } from "@fast-crud/fast-crud";
import * as api from "./api";
import { FirstRow } from "./api";

/**
 * 定义context参数类型
 */
export type FirstContext = {
  test?: number;
};
export default function ({ crudExpose, context }: CreateCrudOptionsProps<FirstRow, FirstContext>): CreateCrudOptionsRet<FirstRow> {
  context.test = 111;
  return {
    crudOptions: {
      // 自定义crudOptions配置
      request: {
        pageRequest: async (query: UserPageQuery<FirstRow>) => {
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
      },
      //两个字段
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
          })
        }
      }
    }
  };
}
