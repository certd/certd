import * as api from "./api";
import { requestForMock } from "/src/api/service";
import { dict, compute } from "@fast-crud/fast-crud";
import { message } from "ant-design-vue";
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
      form: {
        //配置表单label的宽度
        labelCol: { span: 6 }
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
        button: {
          title: "按钮",
          search: { show: true },
          type: "button",
          column: {
            component: {
              show: compute(({ value }) => {
                //当value为null时，不显示
                return value != null;
              }),
              on: {
                // 注意：必须要on前缀
                onClick({ row }) {
                  message.success("按钮点击:" + row.button);
                }
              }
            }
          }
        },
        url: {
          title: "url",
          search: { show: true },
          type: "text",
          column: {
            show: false
          }
        },
        link: {
          title: "链接",
          search: { show: true },
          type: "link",
          column: {
            component: {
              on: {
                // 注意：必须要on前缀
                onClick({ row }) {
                  if (row.url) {
                    window.open(row.url);
                  }
                }
              }
            }
          },
          form: {
            title: "按钮文字"
          }
        },
        link2: {
          title: "手写link配置",
          search: { show: true },
          type: "text", //form组件用input
          column: {
            component: {
              name: "fs-button", //列展示组件为button
              vModel: "text", // 将row.link2的值赋值给text属性
              type: "link", // 按钮展示为链接样式
              on: {
                //注册点击事件
                // 注意：必须要on前缀
                onClick({ row }) {
                  if (row.url) {
                    window.open(row.url);
                  }
                }
              }
            }
          }
        }
      }
    }
  };
}
