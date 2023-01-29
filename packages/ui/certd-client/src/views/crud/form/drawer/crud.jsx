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
          is: "a-drawer"
        }
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
        }
      }
    }
  };
}
