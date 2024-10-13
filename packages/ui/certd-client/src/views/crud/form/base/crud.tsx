import * as api from "./api";
import { AddReq, compute, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, EditReq, FormScopeContext, FormWrapperContext, ScopeContext, UserPageQuery, UserPageRes, utils } from "@fast-crud/fast-crud";
import { computed } from "vue";
import { message } from "ant-design-vue";

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
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
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest
      },
      form: {
        layout: context.labelLayoutRef,
        labelCol: {
          //固定label宽度
          span: null,
          style: {
            width: computed(() => {
              return context.labelWidthRef.value + "px";
            })
          }
        },
        beforeValidate(context) {
          console.log("beforeValidate", context);
        },
        beforeSubmit(context) {
          console.log("beforeSubmit", context);
        },
        afterSubmit(context) {
          // context.res 是add或update请求返回结果
          if (context.form.id === 1) {
            message.error("模拟保存失败，阻止弹窗关闭，请选择其他行的数据进行编辑保存");
            throw new Error("模拟失败，阻止弹窗关闭");
          }
        },
        onSuccess(context) {
          message.success("保存成功");
        },
        wrapper: {
          title: compute(({ form }) => {
            return form.draft ? "草稿" : "编辑";
          }),
          fullscreen: false,
          buttons: {
            draft: {
              text: "保存草稿",
              type: "primary",
              show: compute(({ form }) => {
                return !!form?.draft;
              })
            },
            ok: {
              text: "保存",
              show: compute(({ form }) => {
                return !form?.draft;
              })
            },
            custom: {
              text: "自定义按钮",
              order: -1,
              click: async (context: FormWrapperContext) => {
                utils.logger.info("btn context", context);
                message.info("通过自定义按钮，触发保存");
                await context.submit();
                message.info("保存成功");
              }
            },
            customClose: {
              text: "自定义关闭",
              color: "red",
              click: async (context: FormWrapperContext) => {
                context.close();
              }
            }
          }
        }
      },
      columns: {
        name: {
          title: "姓名",
          type: "text"
        },
        long: {
          title: "演示Label很长时如何很好的展示",
          type: "text",
          column: {
            ellipsis: true,
            showTitle: true
          }
        },
        draft: {
          title: "草稿",
          type: "switch",
          value: false,
          form: {
            component: {
              name: "a-switch",
              vModel: "checked"
            },
            helper: "开启后，保存按钮将变为保存草稿"
          }
        },
        renderLabel: {
          title: "labelRender",
          type: "text",
          form: {
            title(context: ScopeContext) {
              utils.logger.info("render label context:", context);
              return <div style={{ color: "red" }}>LabelRender</div>;
            },
            helper: {
              text: "配置form.title为一个render方法即可自定义label"
            }
          }
        },
        intro: {
          title: "无label",
          type: "editor-wang5",
          form: {
            labelCol: {
              style: {
                width: "0px"
              }
            },
            col: {
              span: 24
            },
            helper: "不显示label"
          }
        }
      }
    }
  };
}
