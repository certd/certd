import * as api from "./api";
import { dict, compute } from "@fast-crud/fast-crud";
import { message } from "ant-design-vue";
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
      rowHandle: {
        width: 290,
        buttons: {
          remove: {
            // 根据row的值判断按钮是否显示
            show: compute(({ row }) => {
              return row.radio !== "0";
            }),
            dropdown: true //---------》给想要折叠的按钮配置dropdown为true，就会放入dropdown中《---------------
          },
          orderExample: {
            text: "我排前面",
            title: "按钮排序示例",
            type: "link",
            order: 0, //数字越小，越靠前,默认排序号为1
            click(opts) {
              console.log("自定义操作列按钮点击", opts);
              message.success("自定义操作列按钮点击");
            }
          }
        },
        dropdown: {
          // 操作列折叠
          // 至少几个以上的按钮才会被折叠
          // atLeast: 2, //TODO 注意 [atLeast]参数即将废弃，请给button配置dropdown即可放入折叠
          more: {
            text: "更多",
            icon: null,
            iconRight: "ion:caret-down-outline"
          }
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
        radio: {
          title: "状态",
          search: { show: true },
          type: "dict-radio",
          dict: dict({
            url: "/mock/dicts/OpenStatusEnum?single"
          })
        }
      }
    }
  };
}
