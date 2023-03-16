import * as api from "./api";
import { message } from "ant-design-vue";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, EditReq, FormWrapperContext, ScopeContext, UserPageQuery, UserPageRes, utils } from "@fast-crud/fast-crud";
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
        wrapper: {
          buttons: {
            ok: {
              text: "保存"
            },
            custom: {
              text: "自定义按钮",
              click: async (context: FormWrapperContext) => {
                utils.logger.info("btn context", context);
                message.info({ content: "通过自定义按钮，触发保存" });
                await context.submit();
                message.info({ content: "保存成功" });
              }
            }
          }
        }
      },
      columns: {
        name: {
          title: "姓名",
          type: "text"
        },
        renderLabel: {
          title: "labelRender",
          type: "text",
          form: {
            title(context: ScopeContext) {
              console.log("render label context:", context);
              return <div style={{ color: "red" }}>LabelRender</div>;
            },
            helper: {
              text: "配置form.title为一个render方法即可自定义label"
            }
          }
        }
      }
    }
  };
}
