import * as api from "./api";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, EditReq, UserPageQuery, UserPageRes, useUi } from "@fast-crud/fast-crud";

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

  const { ui } = useUi();

  return {
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest
      },
      columns: {
        name: {
          title: "演示表单组件周围的render",
          type: "text",
          form: {
            helper: "演示组件周围自定义render",
            topRender({ value }) {
              return <a-tag color="red">topRender</a-tag>;
            },
            bottomRender({ value }) {
              return <a-tag color="red">bottomRender {value ?? ""}</a-tag>;
            },
            prefixRender({ value }) {
              return <a-tag color="red">prefixRender</a-tag>;
            },
            suffixRender({ value }) {
              return <a-tag color="red">suffixRender</a-tag>;
            }
          }
        },
        render: {
          title: "字段组件本身render",
          type: "text",
          form: {
            helper: "组件本身render",
            render({ form }) {
              return (
                <div>
                  <a-input v-model={[form.render, "value"]} />
                  render value : {form.render}
                </div>
              );
            }
          }
        }
      }
    }
  };
}
