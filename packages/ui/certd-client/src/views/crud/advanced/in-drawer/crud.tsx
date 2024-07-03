import * as api from "./api";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  //从context中获取子组件的ref
  const drawerClassTimeRef = context.drawerClassTimeRef;
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
      rowHandle: {
        width: 300,
        buttons: {
          editClassTime: {
            text: "录入课时",
            click: ({ row }) => {
              //调用子组件暴露的open方法，打开抽屉对话框
              drawerClassTimeRef.value.open({
                textbook: row
              });
            }
          }
        }
      },
      columns: {
        textbookCategory: {
          title: "教材分类",
          type: "text", //虽然不写也能正确显示组件，但不建议省略它
          search: { show: true }
        },
        textbookVersion: {
          title: "教材版本",
          type: "text"
        },
        textbookName: {
          title: "教材名称",
          type: "text"
        },
        totalWords: {
          title: "总词汇数",
          type: "number"
        },
        classTimeNumber: {
          title: "课时数量",
          type: "number",
          column: {
            cellRender({ value }) {
              return `${value}课时`;
            }
          }
        }
      }
    }
  };
}
