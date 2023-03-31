import * as api from "./api";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";

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

  return {
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest
      },
      search: {
        container: {
          layout: "multi-line",
          action: {
            label: "操作"
            //col: { span: 4 }
          }
        },
        options: {
          labelCol: {
            style: {
              width: "100px"
            }
          }
        }
      },
      actionbar: {
        buttons: {
          change: {
            text: "切换模式",
            click() {
              if (crudExpose.crudBinding.value.search.container.layout === "multi-line") {
                crudExpose.crudBinding.value.search.container.layout = "default";
              } else {
                crudExpose.crudBinding.value.search.container.layout = "multi-line";
              }
            }
          },
          search: {
            text: "查询",
            click() {
              crudExpose.getSearchRef().doSearch();
            }
          },
          reset: {
            text: "重置查询",
            click() {
              crudExpose.getSearchRef().doReset();
            }
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
          }),
          column: {
            filters: [
              { text: "开", value: "1" },
              { text: "关", value: "0" },
              { text: "停", value: "2" }
            ],
            onFilter: (value: any, record: any) => {
              return record.radio === value;
            },
            sorter: (a: any, b: any) => a.radio - b.radio,
            sortDirections: ["descend"]
          }
        },
        text1: {
          type: "datetimerange",
          title: "datetimerange",
          search: { show: true, col: { span: 8 } }
        },
        text2: {
          type: "text",
          title: "text2",
          search: { show: true }
        },
        text3: {
          type: "text",
          title: "text3",
          search: { show: true }
        },
        text4: {
          type: "text",
          title: "text4",
          search: { show: true }
        },
        text5: {
          type: "text",
          title: "text5",
          search: { show: true }
        },
        text6: {
          type: "text",
          title: "text6",
          search: { show: true }
        },
        text7: {
          type: "text",
          title: "text7",
          search: { show: true }
        },
        text8: {
          type: "text",
          title: "text8",
          search: { show: true }
        }
      }
    }
  };
}
