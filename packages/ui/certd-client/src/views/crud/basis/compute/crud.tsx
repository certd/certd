import * as api from "./api";
import { requestForMock } from "/src/api/service";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, EditReq, GetContextFn, ScopeContext, useCompute, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { message } from "ant-design-vue";
import { computed } from "vue";

const { asyncCompute, compute } = useCompute();
export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
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

  const { showRef, showTableComputed, columnComponentShowComputed } = context;

  return {
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest
      },
      table: {
        scroll: {
          x: 1500
        },
        //通过switch动态显隐table
        show: showTableComputed //不仅支持computed，直接传showTableRef也是可以的
      },
      form: {
        labelCol: { span: 8 },
        wrapperCol: { span: 14 }
      },
      rowHandle: {
        fixed: "right",
        show: computed(() => {
          return true;
        }),
        buttons: {
          edit: {
            show: compute<boolean>(({ row }) => {
              return row.editable;
            })
          },
          remove: {
            show: compute(({ row }) => {
              return row.editable;
            })
          }
        }
      },
      columns: {
        id: {
          title: "ID",
          key: "id",
          type: "number",
          column: {
            width: 50,
            resizable: true
          },
          form: {
            show: false
          }
        },
        refSwitch: {
          title: "ref引用切换",
          type: "text",
          form: {
            helper: "点我切换右边的输入框显示"
          }
        },
        ref: {
          title: "根据ref引用显示",
          type: ["text"],
          form: {
            component: {
              show: showRef
            },
            helper: "我会根据showRef进行显隐"
          }
        },
        compute: {
          title: "compute",
          search: { show: false },
          type: "text",
          column: {
            show: columnComponentShowComputed,
            columnSetDisabled: true, //这里采用自定义控制显隐，那么列设置里面就要禁用
            // columnSetShow: false, //直接不在列设置里面显示也行
            component: {
              name: "a-switch",
              vModel: "checked"
            }
          },
          form: {
            component: {
              name: "a-switch",
              vModel: "checked"
            },
            helper: "点我触发动态计算"
          }
        },
        shower: {
          title: "根据compute显示",
          search: { show: false },
          type: "button",
          form: {
            component: {
              show: compute(({ form }) => {
                return form.compute;
              })
            }
          },
          column: {
            width: 250,
            resizable: true,
            component: {
              show: compute(({ row }) => {
                return row.compute;
              })
            }
          }
        },
        remote: {
          title: "asyncCompute",
          search: { show: true },
          type: "text",
          form: {
            component: {
              name: "a-select",
              vModel: "value",
              placeholder: "异步计算远程获取options",
              options: asyncCompute({
                async asyncFn(watchValue: any, context: GetContextFn) {
                  const url = "/mock/dicts/OpenStatusEnum?remote";
                  return await requestForMock({ url });
                }
              })
            },
            helper: "我的options是异步计算远程获取的,只会获取一次"
          }
        },
        remote2: {
          title: "监听switch触发异步计算",
          search: { show: false },
          type: "text",
          form: {
            component: {
              name: "a-select",
              vModel: "value",
              placeholder: "异步计算远程获取options",
              options: asyncCompute({
                watch({ form }: ScopeContext) {
                  return form.compute;
                },
                async asyncFn(watchValue: string) {
                  message.info("监听switch,触发远程获取options");
                  const url = watchValue ? "/mock/dicts/OpenStatusEnum?remote" : "/mock/dicts/moreOpenStatusEnum?remote";
                  return await requestForMock({ url });
                }
              })
            },
            helper: "监听其他属性修改后，触发重新计算"
          },
          column: {
            width: 200
          }
        },
        editable: {
          title: "可编辑",
          search: { show: false },
          type: "text",
          column: {
            fixed: "right",
            component: {
              name: "a-switch",
              vModel: "checked"
            }
          },
          form: {
            show: false
          }
        }
      }
    }
  };
}
