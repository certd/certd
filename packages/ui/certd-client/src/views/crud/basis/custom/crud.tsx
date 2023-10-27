import * as api from "./api";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { shallowRef } from "vue";
import VmodelCounter from "./vmodel-counter.vue";
import { message } from "ant-design-vue";

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
        counter: {
          title: "自定义组件",
          type: "text",
          column: {
            component: {
              //引用自定义组件
              name: shallowRef(VmodelCounter),
              color: "blue",
              slots: {
                //插槽示例
                default() {
                  return <span>counter on cell:</span>;
                }
              },
              on: {
                //监听事件
                onChange({ $event, row }) {
                  message.info("counter changed:" + $event);
                }
              }
            }
          },
          form: {
            //form表单
            component: {
              //引用自定义组件
              name: shallowRef(VmodelCounter),
              vModel: "modelValue",
              color: "red",
              on: {
                //监听事件
                onChange({ $event, form }) {
                  message.info("counter changed:" + $event);
                }
              },
              slots: {
                //插槽示例
                default() {
                  return <span>counter on form:</span>;
                }
              }
            }
          },
          search: {
            show: true,
            //form表单
            component: {
              color: "yellow",
              slots: {
                //插槽示例
                default() {
                  return "counter:";
                }
              }
            }
          }
        },
        cellRender: {
          title: "单元格render",
          type: "text",
          column: {
            cellRender({ value }) {
              return <a-tag>{value}</a-tag>;
            }
          }
        },
        formAroundRender: {
          title: "表单组件周围的render",
          type: "text",
          form: {
            helper: "演示组件周围自定义render",
            topRender({ value }) {
              return <a-tag color="red">topRender</a-tag>;
            },
            bottomRender({ value }) {
              return <a-tag color="red">bottomRender {value ?? ""}</a-tag>;
            },
            prefixRender({ value }) {
              return <a-tag color="red">prefixRender</a-tag>;
            },
            suffixRender({ value }) {
              return <a-tag color="red">suffixRender</a-tag>;
            }
          }
        },
        formRender: {
          title: "字段组件本身render",
          type: "text",
          form: {
            helper: "组件本身render",
            render({ form }) {
              return (
                <div>
                  <a-input v-model={[form.formRender, "value"]} />
                  render value : {form.formRender}
                </div>
              );
            }
          }
        }
      }
    }
  };
}
