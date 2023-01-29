import * as api from "./api";
export default function ({ expose, authz }) {
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
      rowHandle: {
        width: 300,
        buttons: {
          authz: {
            type: "link",
            text: "授权",
            async click(context) {
              await authz.authzOpen(context.record.id);
            }
          }
        }
      },
      columns: {
        id: {
          title: "id",
          form: { show: false }, // 表单配置
          column: {
            width: 70,
            sorter: true
          }
        },
        name: {
          title: "角色名称",
          type: "text",
          search: { show: true },
          form: {
            rules: [
              { required: true, message: "请输入角色名称" },
              { max: 50, message: "最大50个字符" }
            ]
          }, // 表单配置
          column: {
            sorter: true
          }
        },
        createTime: {
          title: "创建时间",
          type: "datetime",
          column: {
            sorter: true
          },
          form: {
            show: false
          }
        },
        updateTime: {
          title: "更新时间",
          type: "datetime",
          column: {
            sorter: true
          },
          form: { show: false } // 表单配置
        }
      }
    }
  };
}
