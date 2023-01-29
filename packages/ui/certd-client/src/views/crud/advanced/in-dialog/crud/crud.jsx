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
      columns: {
        name: {
          title: "姓名",
          type: "text", //虽然不写也能正确显示组件，但不建议省略它
          search: { show: true },
          form: {
            component: {
              maxlength: 20
            }
          }
        },
        search: {
          title: "搜索",
          type: "text",
          form: {
            component: {
              addonAfter: "后置",
              suffix: "suffix",
              children: {
                addonBefore() {
                  return <SearchOutlined />;
                }
              }
            }
          }
        },
        password: {
          title: "密码",
          type: "password",
          column: {
            //一般密码不显示在列里面
            show: false
          }
        },
        intro: {
          title: "简介",
          type: "textarea",
          form: {
            component: { showWordLimit: true, maxlength: 200 }
          },
          column: {
            ellipsis: true
          }
        },
        render: {
          title: "复杂输入(render)",
          form: {
            title: "复杂输入",
            component: {
              render(context) {
                console.log("context scope", context);
                return (
                  <a-input-group compact>
                    <a-input
                      placeholder={"render1 input"}
                      style="width: 50%"
                      v-model={[context.form.render, "value"]}
                    />
                    <a-input
                      placeholder={"render2 input"}
                      style="width: 50%"
                      v-model={[context.form.render2, "value"]}
                    />
                  </a-input-group>
                );
              }
            }
          }
        },
        render2: {
          title: "我的值是由复杂输入列输入的",
          column: {
            width: "300px"
          },
          form: {
            show: false
          }
        }
      }
    }
  };
}
