import * as api from "./api";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";

export default function ({ crudExpose }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetList(query);
  };
  const editRequest = async ({ form, row }: EditReq) => {
    if (form.id == null) {
      form.id = row.id;
    }
    return await api.UpdateObj(form);
  };
  const delRequest = async ({ row }: DelReq) => {
    return await api.DelObj(row.id);
  };

  const addRequest = async ({ form }: AddReq) => {
    return await api.AddObj(form);
  };

  return {
    output: {},
    crudOptions: {
      //大量数据的crud配置
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest
      },
      table: {
        scroll: {
          //启用横向滚动条，设置一个大于所有列宽之和的值，一般大于表格宽度
          x: 2400
        }
      },
      pagination: {
        pageSize: 100
      },
      rowHandle: {
        fixed: "right"
      },
      columns: {
        id: {
          title: "ID",
          type: "number",
          column: {
            width: 50
          },
          form: {
            show: false
          }
        },
        text: {
          title: "文本",
          type: "text"
        },
        dict1: {
          title: "字典1",
          type: "dict-select",
          dict: dict({
            url: "/mock/dicts/ManyOpenStatusEnum?from=dict1"
          })
        },
        dict2: {
          title: "字典2",
          type: "dict-select",
          dict: dict({
            url: "/mock/dicts/ManyOpenStatusEnum?from=dict2"
          })
        },
        dict3: {
          title: "字典3",
          type: "dict-select",
          dict: dict({
            url: "/mock/dicts/ManyOpenStatusEnum?from=dict3"
          })
        },
        dict4: {
          title: "字典4",
          type: "dict-select",
          dict: dict({
            url: "/mock/dicts/ManyOpenStatusEnum?from=dict4"
          })
        },
        dict5: {
          title: "字典5",
          type: "dict-select",
          dict: dict({
            url: "/mock/dicts/ManyOpenStatusEnum?from=dict5"
          })
        },
        dict6: {
          title: "字典6",
          type: "dict-select",
          dict: dict({
            url: "/mock/dicts/ManyOpenStatusEnum?from=dict6"
          })
        },
        dict7: {
          title: "字典7",
          type: "dict-select",
          dict: dict({
            url: "/mock/dicts/ManyOpenStatusEnum?from=dict7"
          })
        },
        dict8: {
          title: "字典8",
          type: "dict-select",
          dict: dict({
            url: "/mock/dicts/ManyOpenStatusEnum?from=dict8"
          })
        },
        dict9: {
          title: "字典9",
          type: "dict-select",
          dict: dict({
            url: "/mock/dicts/ManyOpenStatusEnum?from=dict9"
          })
        },
        dict10: {
          title: "字典10",
          type: "dict-select",
          dict: dict({
            url: "/mock/dicts/ManyOpenStatusEnum?from=dict10"
          })
        },
        text1: {
          title: "文本",
          type: "text"
        },
        text2: {
          title: "文本",
          type: "text"
        },
        text3: {
          title: "文本",
          type: "text"
        },
        text4: {
          title: "文本",
          type: "text"
        },
        text5: {
          title: "文本",
          type: "text"
        },
        text6: {
          title: "文本",
          type: "text"
        },
        text7: {
          title: "文本",
          type: "text"
        },
        text8: {
          title: "文本",
          type: "text"
        },
        text9: {
          title: "文本",
          type: "text"
        },
        text10: {
          title: "文本",
          type: "text"
        }
      }
    }
  };
}
