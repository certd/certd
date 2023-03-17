import * as api from "./api";
import { message } from "ant-design-vue";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes, ValueChangeContext } from "@fast-crud/fast-crud";

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
      columns: {
        id: {
          title: "ID",
          key: "id",
          type: "number",
          column: {
            width: 50
          },
          form: {
            show: false
          }
        },
        switch: {
          title: "开关",
          type: "dict-switch",
          dict: dict({
            data: [
              { value: true, label: "开启" },
              { value: false, label: "关闭" }
            ]
          }),
          column: {
            component: {
              name: "fs-dict-switch",
              vModel: "checked"
            },
            valueChange(context: ValueChangeContext) {
              console.log("column value changed:", context);
            }
          },
          form: {
            valueChange({ value, key, form }: ValueChangeContext) {
              console.log("valueChanged,", key, value, form);
              message.info(`valueChanged:${key}=${value}`);
            }
          }
        },
        normal: {
          title: "value-change",
          type: "text",
          form: {
            valueChange({ value, key, form }: ValueChangeContext) {
              console.log("valueChanged,", key, value, form);
              message.info(`valueChanged:${key}=${value}`);
            }
          }
        },
        immediate: {
          title: "immediate",
          type: "text",
          search: {
            show: true
          },
          form: {
            valueChange: {
              handle({ value, key, form, immediate }: ValueChangeContext) {
                console.log("valueChange,", key, value, "isImmediate=", immediate);
                message.info(`valueChanged:${key}=${value},isImmediate=${immediate}`);
              },
              immediate: true
            }
          }
        }
      }
    }
  };
}
