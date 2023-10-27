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
      pagination: {
        showSizeChanger: false, // antdv
        showQuickJumper: false // antdv
      },
      request: {
        pageRequest: api.GetList,
        addRequest,
        editRequest,
        delRequest
      },
      toolbar: {
        compact: false
      },
      rowHandle: {
        width: "230px"
      },
      table: {},
      columns: {
        gradeId: {
          title: "年级Id",
          search: { show: true },
          type: "number",
          column: {
            width: 80,
            align: "center",
            sortable: true
          }
        },
        class: {
          title: "班级",
          search: { show: false },
          type: "text",
          column: {
            sortable: true
          }
        }
      }
    }
  };
}
