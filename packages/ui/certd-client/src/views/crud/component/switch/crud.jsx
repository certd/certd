import * as api from "./api";
import { dict, compute } from "@fast-crud/fast-crud";
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
        switch: {
          title: "状态",
          search: { show: true },
          type: "dict-switch",
          dict: dict({
            data: [
              { value: false, label: "开启" },
              { value: true, label: "关闭" }
            ]
          })
        },
        notBool: {
          title: "自定义value",
          search: { show: true },
          type: "dict-switch",
          dict: dict({
            data: [
              { value: "1", label: "开启" },
              { value: "2", label: "关闭" }
            ]
          })
        },
        switchLabel: {
          title: "切换字段label",
          search: { show: true },
          type: "dict-switch",
          dict: dict({
            data: [
              { value: true, label: "开启" },
              { value: false, label: "关闭" }
            ]
          }),
          column: {
            show: false
          }
        },
        labelTarget: {
          title: "我将被切换",
          type: "text",
          column: {
            show: false
          },
          form: {
            label: compute(({ form }) => {
              return form.switchLabel ? "我将被切换" : "再切换一下";
            })
          }
        },
        cellSwitch: {
          title: "cell显示",
          search: { show: true },
          type: "dict-switch",
          form: {
            component: {}
          },
          column: {
            component: {
              name: "fs-dict-switch",
              vModel: "checked",
              onChange: (value) => {
                console.log("onChange", value);
              }
              // onChange: compute((context) => {
              //   //动态onChange方法测试
              //   return () => {
              //     console.log("onChange", context.row.cellSwitch);
              //   };
              // })
            }
          },
          dict: dict({
            data: [
              { value: true, label: "开启" },
              { value: false, label: "关闭" }
            ]
          })
        },
        showTarget: {
          title: "显隐目标",
          type: "text",
          column: {
            component: {
              name: "fs-values-format",
              show: compute((context) => {
                //根据cellSwitch字段显隐
                return context.row.cellSwitch === true;
              })
            }
          },
          search: {
            show: false
          },
          form: {
            show: compute((context) => {
              console.log("context", context);
              //根据cellSwitch字段显隐
              return context.form.cellSwitch === true;
            })
          }
        }
      }
    }
  };
}
