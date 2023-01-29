import * as api from "./api";
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
        wrapper: {
          async onOpened({ mode, formRef }) {
            if (!formRef.form.async) {
              setTimeout(() => {
                formRef.form.async = { aaa: "11", bb: "111" };
              }, 2000);
            }
          }
        }
      },
      columns: {
        json: {
          title: "json",
          type: "json",
          form: {
            valueBuilder({ form }) {
              if (form.json == null) {
                return;
              }
              form.json = JSON.parse(form.json);
            },
            valueResolve({ form }) {
              if (form.json == null) {
                return;
              }
              form.json = JSON.stringify(form.json);
            }
          }
        },
        async: {
          title: "异步加载",
          type: "json",
          form: {
            // 上面form.wrapper.onOpened里面配置了异步加载
            helper: "在onOpened里面配置异步加载json字符串",
            valueBuilder({ form }) {
              if (form.async == null) {
                return;
              }
              form.async = JSON.parse(form.async);
            },
            valueResolve({ form }) {
              if (form.async == null) {
                return;
              }
              form.async = JSON.stringify(form.async);
            }
          }
        }
      }
    }
  };
}
