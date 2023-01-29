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
        // 具体可配置请参考 grid 布局： http://www.ruanyifeng.com/blog/2019/03/grid-layout-tutorial.html
        display: "grid"
      },
      columns: {
        avatar: {
          title: "头像上传",
          type: "avatar-uploader",
          form: {
            order: 0,
            col: {
              style: { gridRow: "span 3" }
            },
            helper: "通过grid布局，可以实现比flex更加规整的排列"
          }
        },
        name: {
          title: "姓名",
          type: "text",
          search: { show: true }
        },
        order: {
          title: "占位演示",
          type: "text"
        },
        place: {
          title: "占位演示",
          type: "text"
        },
        intro: {
          title: "跨列",
          type: "textarea",
          form: {
            col: {
              style: { gridColumn: "span 2" } // grid 模式控制跨列
            }
          }
        }
      }
    }
  };
}
