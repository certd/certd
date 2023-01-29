import * as api from "./api";
export default function ({ expose }) {
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
        pageRequest: api.GetList,
        addRequest,
        editRequest,
        delRequest
      },
      toolbar: {
        //工具按钮排序
        buttons: {
          search: { order: 1 } // 查询按钮排到前面
        }
      },
      form: {
        //表单跨列
        col: { span: 24 },
        labelCol: { span: 6 }
      },
      columns: {
        col1: {
          title: "col.1",
          search: { show: true },
          type: "text"
        },
        col2: {
          title: "col.2,我排最后一个",
          search: {
            //控制查询字段顺序
            show: true,
            //字段默认order为100，比100大的放最后面
            order: 101
          },
          type: "text",
          column: {
            //控制列字段顺序
            //字段默认order为100，比100大的放最后面
            order: 101
          },
          form: {
            //控制表单字段顺序
            //字段默认order为100，比100大的放最后面
            order: 101
          }
        },
        col3: {
          title: "col.3,我排第一个",
          search: {
            show: true,
            order: 0
          },
          type: "text",
          column: {
            order: 0
          },
          form: {
            order: 0
          }
        },
        col4: {
          title: "col.4,我在col3后面",
          type: "text",
          search: {
            show: true,
            order: 0
          },
          column: {
            order: 0
          },
          form: {
            order: 0
          }
        },
        col5: {
          title: "col.5",
          type: "text"
        }
      }
    }
  };
}
