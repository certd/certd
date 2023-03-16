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
      form: {
        display: "flex",
        labelCol: {
          //固定label宽度
          span: null,
          style: {
            width: "120px"
          }
        },
        wrapperCol: {
          span: null
        }
      },
      columns: {
        name: {
          title: "姓名",
          type: "text",
          search: { show: true }
        },
        order: {
          title: "字段排序",
          type: "text",
          form: {
            order: 0
          }
        },
        intro: {
          title: "跨列",
          search: { show: true },
          type: ["textarea"],
          form: {
            col: { span: 24 }
          }
        }
      }
    }
  };
}
