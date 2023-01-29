import * as api from "./api";
import { dict } from "@fast-crud/fast-crud";
import { ref } from "vue";
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
  const crudBinding = expose.crudBinding;
  return {
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest
      },
      table: {
        onResizeColumn: (w, col) => {
          //触发resize事件后，修改column宽度，width只能配置为number类型
          //可以将此方法写在app.use()中的commonOptions里面
          crudBinding.value.table.columnsMap[col.key].width = w;
        }
      },
      columns: {
        id: {
          title: "ID",
          key: "id",
          type: "number",
          column: {
            width: 50, //宽度必须number类型
            resizable: true //配置true，表示可以调整宽度
          },
          form: {
            show: false
          }
        },
        text: {
          title: "说明",
          type: "text",
          column: {
            ellipsis: true,
            showTitle: true,
            resizable: true, //配置true，表示可以调整宽度
            width: 400 //宽度必须number类型
          }
        },
        //必须留一个自动宽度
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
