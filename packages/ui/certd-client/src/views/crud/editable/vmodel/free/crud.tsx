import * as api from "./api";
import { dict, compute, CreateCrudOptionsProps, CreateCrudOptionsRet, UserPageQuery, UserPageRes, EditReq, DelReq, AddReq } from "@fast-crud/fast-crud";
export default function ({ crudExpose }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { crudBinding } = crudExpose;
  // const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
  //   return await api.GetList(query);
  // };
  // const editRequest = async ({ form, row }: EditReq) => {
  //   form.id = row.id;
  //   return await api.UpdateObj(form);
  // };
  // const delRequest = async ({ row }: DelReq) => {
  //   return await api.DelObj(row.id);
  // };
  //
  // const addRequest = async ({ form }: AddReq) => {
  //   return await api.AddObj(form);
  // };

  return {
    crudOptions: {
      actionbar: {
        buttons: {
          add: {
            show: false
          },
          addRow: {
            show: true
          }
        }
      },
      search: {
        show: false
      },
      toolbar: {
        buttons: {
          refresh: {
            show: false
          }
        }
      },
      mode: {
        name: "local",
        isMergeWhenUpdate: true,
        isAppendWhenAdd: true
      },
      table: {
        editable: {
          enabled: true,
          mode: "free"
        }
      },
      pagination: { show: false, pageSize: 9999999 },
      columns: {
        id: {
          title: "ID",
          type: "number",
          form: {
            show: false
          },
          column: { width: 80, align: "center" }
        },
        radio: {
          title: "状态",
          search: { show: true },
          type: "dict-radio",
          dict: dict({
            url: "/mock/dicts/OpenStatusEnum?single"
          })
        },
        name: {
          title: "姓名",
          type: "text",
          form: {
            rules: [
              { required: true, message: "请输入姓名" },
              { min: 2, max: 10, message: "长度在 2 到 10 个字符" }
            ]
          }
        },
        createdAt: {
          column: {
            show: false
          }
        }
      }
    }
  };
}
