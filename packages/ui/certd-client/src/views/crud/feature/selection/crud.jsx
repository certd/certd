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
  const selectedRowKeys = ref([]);

  const onSelectChange = (changed) => {
    console.log("selection", changed);
    selectedRowKeys.value = changed;
  };
  return {
    selectedRowKeys, //返回给index.vue去使用
    crudOptions: {
      table: {
        rowKey: "id",
        rowSelection: {
          selectedRowKeys: selectedRowKeys,
          onChange: onSelectChange,
          getCheckboxProps: (record) => ({
            disabled: record.id === 1 // 此处演示第一行禁用
          })
        }
      },
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
