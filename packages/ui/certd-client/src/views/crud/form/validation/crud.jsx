import * as api from "./api";
import { dict, useExpose } from "@fast-crud/fast-crud";
export default function ({ expose }) {
  const { getFormRef, getFormData } = expose;
  const validatePass1 = async (rule, value) => {
    if (value === "") {
      throw new Error("请输入密码");
    }
    if (getFormData().password2 !== "") {
      getFormRef().getFormRef().validateFields(["password2"]);
    }
  };
  const validatePass2 = async (rule, value) => {
    if (value === "") {
      throw new Error("请再次输入密码");
    } else if (value !== getFormData().password) {
      throw new Error("两次输入密码不一致!");
    }
  };
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
        row:{
          gutter:20
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
        password: {
          title: "密码",
          type: "password",
          column: {
            component: {
              cellRender() {
                return <span>******</span>;
              }
            }
          },
          form: {
            rules: [
              { required: true, message: "请输入密码" },
              { validator: validatePass1, trigger: "blur" }
            ]
          }
        },
        password2: {
          title: "确认密码",
          type: "password",
          column: { show: false },
          form: {
            rules: [
              { required: true, message: "请输入确认密码" },
              { validator: validatePass2, trigger: "blur" }
            ]
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
