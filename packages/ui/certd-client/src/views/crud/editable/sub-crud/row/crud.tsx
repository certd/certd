import {
  AddReq,
  CreateCrudOptionsProps,
  CreateCrudOptionsRet, DelReq,
  dict,
  EditReq,
  UserPageQuery,
  UserPageRes
} from "@fast-crud/fast-crud";
import * as api from "./api";
export default function ({ crudExpose,context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { crudBinding } = crudExpose;
  const {parentIdRef} = context
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
        show: false,
        initialForm:{
          parentId:parentIdRef
        }
      },
      toolbar: {
        buttons: {
          refresh: {
            show: false
          }
        }
      },
      table: {
        editable: {
          enabled: true,
          mode: "row",
          activeDefault:false,
        }
      },
      // pagination: { show: false, pageSize: 9999999 },
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
          }),
          form:{
            value:'1',
          }
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
        parentId:{
          title: "父Id",
          type: "number",
          search:{
            show:true,
          },
          form:{
            value:parentIdRef,
            component:{
              disabled:true
            }
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
