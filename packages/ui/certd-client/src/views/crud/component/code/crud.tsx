import * as api from "./api";

import { FsEditorCodeValidators } from "@fast-crud/editor-code";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, EditReq, UserPageQuery, UserPageRes, ValueBuilderContext, ValueResolveContext } from "@fast-crud/fast-crud";
export default async function ({ crudExpose }: CreateCrudOptionsProps): Promise<CreateCrudOptionsRet> {
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
      form: {
        wrapper: {
          async onOpened({ mode, formRef }) {
            // if (!formRef.form.async) {
            //   setTimeout(() => {
            //     formRef.form.async = { aaa: "11", bb: "111" };
            //   }, 2000);
            // }
          }
        }
      },
      columns: {
        javascript: {
          title: "js code",
          type: "editor-code",
          form: {
            show: true,
            component: {
              language: "javascript"
            }
          }
        },
        yaml: {
          title: "yaml",
          type: "editor-code",
          form: {
            show: true,
            rules: FsEditorCodeValidators.yamlRule,
            component: {
              language: "yaml",
              schema: {
                //数据校验提示
                type: "object",
                properties: {
                  p1: {
                    enum: ["v1", "v2"],
                    description: "数据校验提示"
                  },
                  property: {
                    description: "I have a description"
                  },
                  titledProperty: {
                    title: "I have a title",
                    description: "I also have a description"
                  },
                  markdown: {
                    markdownDescription: "Even **markdown** _descriptions_ `are` ~~not~~ supported!"
                  }
                }
              }
            }
          }
        },
        json: {
          title: "json",
          type: "editor-code",
          form: {
            show: true,
            rules: FsEditorCodeValidators.jsonRule,
            component: {
              language: "json",
              vModel: "modelValue",
              schema: {
                //校验提示
                type: "object",
                properties: {
                  p1: {
                    enum: ["v1", "v2"],
                    description: "数据校验示例"
                  }
                }
              },
              config: {}
            }
          }
        }
      }
    }
  };
}
