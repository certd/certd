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

  const statusRef = dict({
    url: "/mock/dicts/OpenStatusEnum?single"
  });
  return {
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest
      },
      search: {
        initialForm: {
          radio: null
        },
        buttons: {
          custom: {
            text: "自定义",
            show: true,
            order: 3,
            class: "fs-test",
            icon: {
              icon: "ant-design:search",
              style: {
                "font-size": "16px"
              }
            },
            click() {
              console.log("点击了自定义按钮");
            }
          }
        }
      },
      tabs: {
        name: "radio",
        show: true,
        type: "card",
        options: computed(() => {
          return statusRef.data;
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
        radio: {
          title: "状态",
          search: { show: true },
          type: "dict-radio",
          dict: statusRef
        },
        customRender: {
          title: "自定义render",
          search: {
            show: true
          },
          type: "text",
          form: {
            render({ form }) {
              //注意此处的v-model写法
              return <a-input v-model={[form.customRender, "value"]} />;
            }
          }
        }
      }
    }
  };
}
