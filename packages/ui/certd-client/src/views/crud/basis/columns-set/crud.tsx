import * as api from "./api.js";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { message } from "ant-design-vue";
export default function ({ crudExpose }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { crudBinding } = crudExpose;
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetList(query);
  };
  const editRequest = async ({ form, row }: EditReq) => {
    form.id = row.id;
    return await api.UpdateObj(form);
  };
  const delRequest = async ({ row }: DelReq) => {
    return await api.DelObj(row.id);
  };

  const addRequest = async ({ form }: AddReq) => {
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
      toolbar: {
        columnsFilter: {
          mode: "default"
        }
      },
      actionbar: {
        buttons: {
          toggleMode: {
            text: "切换简单模式",
            click() {
              crudBinding.value.toolbar.columnsFilter.mode = crudBinding.value.toolbar.columnsFilter.mode === "simple" ? "default" : "simple";
              message.info("当前列设置组件的模式为：" + crudBinding.value.toolbar.columnsFilter.mode);
            }
          },
          toggleColumnSetShow: {
            text: "切换列设置项显隐",
            click() {
              crudBinding.value.toolbar.columnsFilter.originalColumns.hidden.columnSetShow = !crudBinding.value.toolbar.columnsFilter.originalColumns.hidden.columnSetShow;
              message.info("切换第4列的列设置显隐");
            }
          },
          toggleColumnSetDisabled: {
            text: "切换列设置项禁用",
            click() {
              crudBinding.value.toolbar.columnsFilter.originalColumns.disabled.columnSetDisabled = !crudBinding.value.toolbar.columnsFilter.originalColumns.disabled.columnSetDisabled;
              message.info("切换第3列的列设置禁用启用");
            }
          },
          desc: {
            text: "点击左侧按钮后，再点最右侧的列设置按钮查看效果"
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
        },
        disabled: {
          title: "列设置禁用",
          type: "text",
          column: {
            columnSetDisabled: true
          }
        },
        hidden: {
          title: "列设置隐藏",
          type: "text",
          column: {
            columnSetShow: false
          }
        }
      }
    }
  };
}
