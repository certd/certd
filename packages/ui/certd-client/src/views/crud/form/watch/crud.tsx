import * as api from "./api";
import { AddReq, CreateCrudOptionsRet, DelReq, dict, EditReq, FormScopeContext, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";

export default function (): CreateCrudOptionsRet {
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
      settings: {
        viewFormUseCellComponent: true
      },
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest
      },
      form: {
        initialForm: {
          name: "123"
        },
        watch(context: FormScopeContext) {
          const { form } = context;
          form.c = form.a + form.b;
        }
      },
      columns: {
        name: {
          title: "姓名",
          type: "text"
        },
        age: {
          title: "年龄",
          type: "text"
        },
        a: {
          title: "a",
          type: "number"
        },
        b: {
          title: "b",
          type: "number"
        },
        c: {
          title: "c",
          type: "number",
          form: {
            component: {
              disabled: true
            },
            helper: "c=a+b，实时计算"
          }
        }
      }
    }
  };
}
