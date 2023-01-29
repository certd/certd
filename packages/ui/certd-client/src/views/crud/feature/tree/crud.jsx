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
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest
      },
      table: {
        rowSelection: { selectedRowKeys: selectedRowKeys, onChange: onSelectChange }
      },
      columns: {
        id: {
          title: "ID",
          key: "id",
          type: "number",
          column: {
            width: 100
          },
          form: {
            show: false
          }
        },
        time: {
          title: "时间",
          type: "datetime",
          column: {
            width: 180
          }
        },
        province: {
          title: "地区",
          type: "dict-select",
          search: { show: true },
          form: {
            component: { filterable: true, multiple: true }
          },
          dict: dict({
            data: [
              { value: "sz", label: "深圳" },
              { value: "gz", label: "广州" },
              { value: "wh", label: "武汉" },
              { value: "sh", label: "上海" }
            ]
          }),
          column: {
            width: 300
          }
        },
        amount: {
          title: "金额(元)",
          key: "amount"
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
