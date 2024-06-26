import * as api from "./api";
import { computed } from "vue";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const textbookRef = context.textbookRef;
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetList(query);
  };
  const editRequest = async ({ form, row }: EditReq) => {
    if (form.id == null) {
      form.id = row.id;
    }
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
        textbookId: {
          title: "教材ID",
          type: "text",
          search: {
            show: true
          },
          form: {
            value: computed(() => {
              //动态设置初始值
              return textbookRef.value.id;
            })
          }
        },
        textbookCategory: {
          title: "教材分类",
          type: "text",
          form: { show: false },
          column: {
            //本字段禁止条件render，因为此字段没有值，是从父组件传过来显示的
            conditionalRender: false,
            cellRender() {
              return textbookRef.value.textbookCategory;
            }
          }
        },
        textbookVersion: {
          title: "教材版本",
          type: "text",
          form: { show: false },
          column: {
            //本字段禁止条件render，因为此字段没有值，是从父组件传过来显示的
            conditionalRender: false,
            cellRender() {
              return textbookRef.value.textbookVersion;
            }
          }
        },
        textbookName: {
          title: "教材名称",
          type: "text",
          form: { show: false },
          column: {
            //本字段禁止条件render，因为此字段没有值，是从父组件传过来显示的
            conditionalRender: false,
            cellRender() {
              return textbookRef.value.textbookName;
            }
          }
        },
        classTimeName: {
          title: "课时名称",
          type: "text"
        }
      }
    }
  };
}
