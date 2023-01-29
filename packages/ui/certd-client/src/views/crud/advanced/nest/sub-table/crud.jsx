import * as api from "./api";
export default function ({ expose, props, ctx }) {
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
      table: {
        customRow(record, index) {
          const clazz = record.id === props.modelValue ? "fs-current-row" : "";
          return {
            onClick() {
              ctx.emit("update:modelValue", record.id);
            },
            class: clazz
          };
        }
      },
      request: {
        pageRequest: api.GetList,
        addRequest,
        editRequest,
        delRequest
      },
      search: { show: false },
      form: {
        wrapper: {
          is: "a-drawer"
        }
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
        name: {
          title: "用户姓名",
          search: { show: true },
          type: "text",
          column: {
            sortable: true
          }
        }
      }
    }
  };
}
