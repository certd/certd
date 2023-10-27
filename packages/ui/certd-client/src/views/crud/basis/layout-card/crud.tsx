import * as api from "./api";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { computed } from "vue";

export default function ({ crudExpose }: CreateCrudOptionsProps): CreateCrudOptionsRet {
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

  const cityDictRef = dict({
    value: "id",
    label: "text",
    data: [
      { id: "sz", text: "深圳", color: "success" },
      { id: "gz", text: "广州", color: "blue" },
      { id: "bj", text: "北京" },
      { id: "wh", text: "武汉" },
      { id: "sh", text: "上海" }
    ]
  });
  return {
    crudOptions: {
      container: {
        is: "fs-layout-card"
      },
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest
      },
      actionbar: {
        show: true
      },
      toolbar: {
        show: true
      },
      search: {
        buttons: {
          actionbarToggle: {
            text: "actionbar/toolbar显隐",
            show: true,
            click() {
              crudExpose.crudBinding.value.actionbar.show = !crudExpose.crudBinding.value.actionbar.show;
              crudExpose.crudBinding.value.toolbar.show = !crudExpose.crudBinding.value.toolbar.show;
            }
          }
        }
      },
      tabs: {
        name: "city",
        show: true,
        type: "card",
        value: "id",
        label: "text",
        options: computed(() => {
          return cityDictRef.data;
        })
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
        name: {
          title: "姓名",
          type: "text",
          search: { show: true }
        },
        city: {
          title: "城市",
          type: "dict-select",
          search: { show: true },
          dict: cityDictRef
        },
        radio: {
          title: "单选",
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
