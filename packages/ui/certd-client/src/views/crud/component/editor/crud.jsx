import * as api from "./api";
import { utils, dict, compute } from "@fast-crud/fast-crud";
export default function ({ expose }) {
  const pageRequest = async (query) => {
    return await api.GetList(query);
  };
  const editRequest = async ({ form, row }) => {
    form.id = row.id;
    return await api.UpdateObj(form);
  };
  const delRequest = async ({ row }) => {
    return await api.DelObj(row.id);
  };

  const addRequest = async ({ form }) => {
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
        title: {
          title: "标题",
          type: "text",
          column: {
            width: 400
          },
          form:{
            col: { span: 24 },
          },
        },
        text: {
          title: "摘要",
          type: "textarea",
          form:{
            col: { span: 24 },
          },
          viewForm: {
            component: {
              name: null,
              render(h, scope) {
                return <div>{scope.value}</div>;
              }
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
          type: ["editor-wang5"], // 富文本图片上传依赖file-uploader，请先配置好file-uploader
          form: {
            helper:"示例已升级到wangEditor5版本，原来的editor-wang目前仍然可以使用，后续fs升级可能会将其删除，请尽快升级到editor-wang5版本",
            col: { span: 24 },
            // 动态显隐字段
            // show: compute(({ form }) => {
            //   return form.change === "wang";
            // }),
            rules: [{ required: true, message: "此项必填" }],
            component: {
              disabled: compute(({ form }) => {
                return form.disabled;
              }),
              id: "1", // 当同一个页面有多个editor时，需要配置不同的id
              config: {},
              uploader: {
                type: "form",
                buildUrl(res) {
                  return res.url;
                }
              }
            }
          }
        }
      }
    }
  };
}
