import * as api from "./api";
import { utils, dict, compute, CreateCrudOptionsProps, CreateCrudOptionsRet, UserPageQuery, UserPageRes, EditReq, DelReq, AddReq, ScopeContext } from "@fast-crud/fast-crud";
import { FsUploaderFormOptions } from "@fast-crud/fast-extends";

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
          type: "number",
          column: {
            width: 50
          },
          form: {
            show: false
          }
        },
        title: {
          title: "标题",
          type: "text",
          column: {
            width: 400
          },
          form: {
            col: { span: 24 }
          }
        },
        text: {
          title: "摘要",
          type: "textarea",
          form: {
            col: { span: 24 }
          },
          viewForm: {
            render(scope: ScopeContext) {
              return <div>{scope.value}</div>;
            }
          }
        },
        disabled: {
          title: "禁用启用",
          search: { show: false },
          type: "dict-switch",
          dict: dict({
            data: [
              { value: true, label: "禁用" },
              { value: false, label: "启用" }
            ]
          })
        },
        content_wang: {
          title: "内容",
          column: {
            width: 300,
            show: false
          },
          type: "editor-wang5", // 富文本图片上传依赖file-uploader，请先配置好file-uploader
          form: {
            helper: "示例已升级到wangEditor5版本，原来的editor-wang目前仍然可以使用，后续fs升级可能会将其删除，请尽快升级到editor-wang5版本",
            col: { span: 24 },
            // 动态显隐字段
            // show: compute(({ form }) => {
            //   return form.change === "wang";
            // }),
            rules: [
              { required: true, message: "此项必填" },
              {
                validator: async (rule, value) => {
                  if (value.trim() === "<p><br></p>") {
                    throw new Error("内容不能为空");
                  }
                }
              }
            ],
            component: {
              disabled: compute(({ form }) => {
                return form.disabled;
              }),
              id: "1", // 当同一个页面有多个editor时，需要配置不同的id
              toolbarConfig: {},
              editorConfig: {},
              onOnChange(value: any) {
                console.log("value changed", value);
              },
              uploader: {
                type: "form",
                buildUrl(res: any) {
                  return res.url;
                }
              } as FsUploaderFormOptions
            }
          }
        }
      }
    }
  };
}
