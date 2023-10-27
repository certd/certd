import * as api from "./api.js";
import { CreateCrudOptionsProps, dict, CreateCrudOptionsRet, EditReq, DelReq, AddReq } from "@fast-crud/fast-crud";
export default function ({ crudExpose }: CreateCrudOptionsProps): CreateCrudOptionsRet {
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
        pageRequest: api.GetList,
        addRequest,
        editRequest,
        delRequest
      },
      table: {
        slots: {
          headerCell({ column }: any) {
            if (column.key === "text") {
              return (
                <span class={"flex "}>
                  Text
                  <a-tooltip title={"tooltip 提示"}>
                    <fs-icon class={"ml-5"} icon={"ion:alert-circle-outline"}></fs-icon>
                  </a-tooltip>
                </span>
              );
            }
          }
        }
      },
      columns: {
        text: {
          title: "text",
          type: "text",
          search: { show: true }
        }
      }
    }
  };
}
