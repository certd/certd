import * as api from "./api";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";

export default function ({}: CreateCrudOptionsProps): CreateCrudOptionsRet {
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
      settings: {
        viewFormUseCellComponent: true
      },
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest
      },
      form: {
        row: {
          gutter: 20
        },
        beforeSubmit(context) {
          console.log("beforeSubmit", context);
        },
        afterSubmit(context) {
          console.log("afterSubmit", context);
        }
      },
      columns: {
        name: {
          title: "姓名",
          type: "text",
          form: {
            helper: "添加和编辑时必填，编辑时额外需要校验长度",
            rules: [{ required: true, message: "请输入姓名" }],
            component: {
              maxlength: 5, // 原生属性要写在这里
              props: {
                type: "text",
                showWordLimit: true
              }
            }
          },
          editForm: {
            rules: [{ min: 2, max: 5, message: "姓名长度为2-5" }]
          }
        },
        age: {
          title: "年龄",
          type: "text",
          form: {
            rules: [{ pattern: /^\d+$/, message: "必须为整数" }],
            helper: "正则表达式"
          }
        },
        status: {
          title: "必选",
          type: "dict-select",
          dict: dict({
            url: "/mock/dicts/OpenStatusEnum"
          }),
          form: {
            rules: [{ required: true, message: "请选择一个选项" }]
          }
        },
        email: {
          title: "邮箱",
          type: "text",
          form: {
            rules: [{ type: "email", message: "请填写正确的邮箱" }]
          }
        },
        url: {
          title: "URL",
          type: "text",
          form: {
            rules: [{ type: "url", message: "请填写正确的url" }]
          }
        }
      }
    }
  };
}
