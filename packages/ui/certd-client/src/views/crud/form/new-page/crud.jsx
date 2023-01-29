import * as api from "./api";
import { useRouter } from "vue-router";
export default function ({ expose }) {
  const router = useRouter();

  const { getFormRef, getFormData } = expose;
  const pageRequest = async (query) => {
    return await api.GetList(query);
  };
  const editRequest = async ({ form, row }) => {
    if (row.id) {
      form.id = row.id;
    }

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
      actionbar: {
        buttons: {
          add: {
            click() {
              router.push("/crud/form/new-page/edit");
            }
          }
        }
      },
      rowHandle: {
        buttons: {
          edit: {
            click(context) {
              router.push("/crud/form/new-page/edit?id=" + context.row.id);
            }
          }
        }
      },
      columns: {
        title: {
          title: "商品标题",
          type: "text"
        },
        code: {
          title: "商品代码",
          search: { show: true },
          type: "text"
        },
        images: {
          title: "图片",
          type: "image-uploader"
        },
        price: {
          title: "价格",
          sortable: true
        },
        store: {
          title: "库存",
          type: "number"
        },
        intro: {
          title: "简介",
          type: "textarea",
          column: {
            ellipsis: true
          }
        },
        content: {
          title: "详情",
          type: ["editor-wang", "colspan"],
          form: {
            itemProps: { labelWidth: "0px" }
          }
        },
        product: {
          title: "未分组字段",
          type: ["text", "colspan"],
          form: {
            helper: "未分组的字段会显示在这里，一般来说你应该把所有字段都编入分组内"
          }
        }
      }
    }
  };
}
