import * as api from "./api";
import * as textTableApi from "../text/api";
import { AddReq, compute, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes, useUi } from "@fast-crud/fast-crud";
import createCrudOptionsText from "../text/crud";

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

  const crudOptionsOverride = {
    table: {
      scroll: {
        x: 2000
      }
    },
    rowHandle: {
      fixed: "right"
    }
  };
  const { ui } = useUi();
  return {
    crudOptions: {
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
        dynamicShow: {
          title: "动态显隐",
          type: "dict-switch",
          dict: dict({
            data: [
              { value: true, label: "显示" },
              { value: false, label: "隐藏" }
            ]
          })
        },
        single: {
          title: "单选",
          search: { show: true },
          type: "table-select",
          dict: dict({
            value: "id",
            label: "name",
            //重要，根据value懒加载数据
            getNodesByValues: async (values: any[]) => {
              return await textTableApi.GetByIds(values);
            }
          }),
          form: {
            show: compute(({ form }) => {
              return form.dynamicShow;
            }),
            component: {
              crossPage: true,
              valuesFormat: {
                labelFormatter: (item: any) => {
                  return `${item.id}.${item.name}`;
                }
              },
              select: {
                placeholder: "点击选择"
              },
              createCrudOptions: createCrudOptionsText,
              crudOptionsOverride,
              on: {
                selectedChange({ $event }) {
                  console.log("selectedChange", $event);
                  ui.message.info(`你选择了${JSON.stringify($event)}`);
                }
              }
            }
          }
        },
        multi: {
          title: "多选",
          search: { show: true },
          type: "table-select",
          dict: dict({
            value: "id",
            label: "name",
            //重要，根据value懒加载数据
            getNodesByValues: async (values: any[]) => {
              return await textTableApi.GetByIds(values);
            }
          }),
          form: {
            component: {
              crossPage: true,
              multiple: true,
              valuesFormat: {
                labelFormatter: (item: any) => {
                  return `${item.id}.${item.name}`;
                }
              },
              select: {
                placeholder: "点击选择"
              },
              createCrudOptions: createCrudOptionsText,
              crudOptionsOverride: crudOptionsOverride
            }
          },
          column: {
            component: {
              labelFormatter: (item: any) => {
                return `${item.id}.${item.name}`;
              }
            }
          }
        },
        valueType: {
          title: "object类型",
          search: { show: true },
          type: "table-select",
          dict: dict({
            value: "id",
            label: "name",
            //重要，根据value懒加载数据
            getNodesByValues: async (values: any[]) => {
              return await textTableApi.GetByIds(values);
            }
          }),
          column: {
            component: {
              valueType: "object"
            }
          },
          form: {
            helper: "这里提交的值是整个对象",
            component: {
              valueType: "object",
              crossPage: true,
              valuesFormat: {
                labelFormatter: (item: any) => {
                  return `${item.id}.${item.name}`;
                }
              },
              select: {
                placeholder: "点击选择"
              },
              createCrudOptions: createCrudOptionsText,
              crudOptionsOverride
            }
          }
        },
        //值是object类型
        valueTypeMulti: {
          title: "object类型多选",
          search: { show: true },
          type: "table-select",
          dict: dict({
            value: "id",
            label: "name",
            getNodesByValues: async (values: any[]) => {
              return await textTableApi.GetByIds(values);
            }
          }),
          column: {
            component: {
              valueType: "object"
            }
          },
          form: {
            helper: "这里提交的值是对象数组",
            component: {
              valueType: "object",
              crossPage: true,
              multiple: true,
              valuesFormat: {
                labelFormatter: (item: any) => {
                  return `${item.id}.${item.name}`;
                }
              },
              select: {
                placeholder: "点击选择"
              },
              createCrudOptions: createCrudOptionsText,
              crudOptionsOverride
            }
          }
        },
        viewMode: {
          title: "查看模式",
          dict: dict({
            value: "id",
            label: "name"
          }),
          column: {
            component: {
              name: "fs-table-select",
              //设置为查看模式
              viewMode: true,
              createCrudOptions: createCrudOptionsText,
              crudOptionsOverride,
              slots: {
                default({ scope, value }) {
                  async function open() {
                    //打开时传入默认查询参数
                    const crudOptions = {
                      search: {
                        initialForm: {
                          classId: value
                        }
                      }
                    };
                    const { crudExpose } = await scope.open({ crudOptions });
                    // 这里还能通过crudExpose等返回值操作表格
                  }

                  return <a-button onClick={open}>点我查看学生列表:{value}</a-button>;
                }
              }
            }
          }
        }
      }
    }
  };
}
