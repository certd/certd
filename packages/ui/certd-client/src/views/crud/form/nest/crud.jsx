import * as api from "./api";
import { dict } from "@fast-crud/fast-crud";
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
        labelCol: { span: 6 },
        wrapperCol: { span: 16 },
        helper: {
          // position: "label" // helper的展示位置全局配置
          // tooltip:{}
        }
      },
      columns: {
        username: {
          title: "用户名",
          type: "text"
        },
        "profile.name": {
          title: "profile.name",
          type: "text",
          search:{show:true},
          form: {
            key: ["profile", "name"],
            rules: [{ required: true, message: "姓名必填" }]
          }
        },
        "profile.age": {
          title: "profile.age",
          type: "number",
          form: {
            key: ["profile", "age"]
          }
        },
        "profile.status": {
          title: "profile.status",
          type: "dict-select",
          dict: dict({
            url: "/mock/dicts/OpenStatusEnum?single"
          }),
          form: {
            key: ["profile", "status"]
          }
        },
        "profile.count": {
          title: "不提交的字段",
          type: "text",
          form: {
            submit: false,
            key: ["profile", "count"]
          }
        }
      }
    }
  };
}
