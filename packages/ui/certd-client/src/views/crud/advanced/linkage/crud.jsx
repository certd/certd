import * as api from "./api";
import { dict } from "@fast-crud/fast-crud";
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
        align: "center"
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
        province: {
          title: "省",
          type: "dict-select",
          search: {
            show: true
          },
          dict: dict({
            url: "/mock/linkage/province",
            value: "id",
            cache: true
          }),
          form: {
            valueChange({ form, value, getComponentRef }) {
              form.city = undefined; // 将“city”的值置空
              form.county = undefined; // 将“county”的值置空
              if (value) {
                getComponentRef("city").reloadDict(); // 执行city的select组件的reloadDict()方法，触发“city”重新加载字典
              }
            }
          }
        },
        city: {
          title: "市",
          type: "dict-select",
          search: {
            show: true
          },
          dict: dict({
            cache: true,
            prototype: true,
            // url() 改成构建url，返回一个url
            url({ form }) {
              if (form && form.province != null) {
                // 本数据字典的url是通过前一个select的选项决定的
                return `/mock/linkage/city?province=${form.province}`;
              }
              return undefined; // 返回undefined 将不加载字典
            },
            value: "id"
          }),
          form: {
            // 注释同上
            valueChange({ value, form, getComponentRef }) {
              if (value) {
                form.county = undefined; // 将county的value置空
                const countySelect = getComponentRef("county");
                if (form && form.province && form.city) {
                  countySelect.reloadDict(); // 重新加载字典项
                } else {
                  countySelect.clearDict(); // 清空选项
                }
              }
            }
          }
        },
        county: {
          title: "区",
          type: "dict-select",
          search: {
            show: true
          },
          dict: dict({
            value: "id",
            cache: true,
            prototype: true,
            url({ form }) {
              if (form && form.province != null && form.city != null) {
                return `/mock/linkage/county?province=${form.province} &city=${form.city}`;
              }
              return undefined;
            }
          })
        }
      }
    }
  };
}
