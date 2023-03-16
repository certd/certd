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
      columns: {
        title: {
          title: "商品标题",
          type: "text"
        },
        code: {
          title: "商品代码",
          search: { show: true },
          type: "text",
          form: {
            rules: [{ required: true, message: "此项必填" }]
          }
        },
        images: {
          title: "图片",
          type: "image-uploader"
        },
        price: {
          title: "价格",
          type: "number",
          sortable: true
        },
        store: {
          title: "库存",
          type: "number"
        },
        intro: {
          title: "简介",
          type: "textarea",
          column: {
            ellipsis: true,
            showTitle: true
          }
        },
        content: {
          title: "详情",
          type: "editor-ueditor",
          form: {
            labelWidth: "0px"
          }
        }
      },
      form: {
        group: {
          groupType: "tabs", //collapse， tabs
          accordion: false,
          groups: {
            base: {
              slots: {
                tab: (scope) => {
                  return (
                    <span style={{ color: scope.hasError ? "red" : "green" }}>
                      <fs-icon icon={"ion:eye"}></fs-icon>
                      商品基础
                    </span>
                  );
                }
              },
              icon: "el-icon-goods",
              columns: ["code", "title", "images"]
            },
            price: {
              tab: "库存价格",
              icon: "el-icon-price-tag",
              columns: ["store", "price"]
            },
            info: {
              tab: "详情",
              collapsed: true, //默认折叠
              icon: "el-icon-warning-outline",
              columns: ["intro", "content"]
            }
            // custom: {
            //   title: "自定义",
            //   collapsed: false,
            //   show(context) {
            //     console.log("custom context", context);
            //     return context.mode === "view";
            //   },
            //   disabled: false,
            //   icon: "el-icon-warning-outline",
            //   columns: ["custom", "custom2"]
            // }
          }
        }
      }
    }
  };
}
