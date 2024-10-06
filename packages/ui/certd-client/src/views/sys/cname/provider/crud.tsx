import * as api from "./api";
import { useI18n } from "vue-i18n";
import { computed, Ref, ref } from "vue";
import { useRouter } from "vue-router";
import { AddReq, compute, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes, utils } from "@fast-crud/fast-crud";
import { useUserStore } from "/@/store/modules/user";
import { useSettingStore } from "/@/store/modules/settings";
import { Modal } from "ant-design-vue";

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const router = useRouter();
  const { t } = useI18n();
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetList(query);
  };
  const editRequest = async ({ form, row }: EditReq) => {
    form.id = row.id;
    const res = await api.UpdateObj(form);
    return res;
  };
  const delRequest = async ({ row }: DelReq) => {
    return await api.DelObj(row.id);
  };

  const addRequest = async ({ form }: AddReq) => {
    form.content = JSON.stringify({
      title: form.title
    });
    const res = await api.AddObj(form);
    return res;
  };

  const userStore = useUserStore();
  const settingStore = useSettingStore();
  const selectedRowKeys: Ref<any[]> = ref([]);
  context.selectedRowKeys = selectedRowKeys;

  return {
    crudOptions: {
      settings: {
        plugins: {
          //这里使用行选择插件，生成行选择crudOptions配置，最终会与crudOptions合并
          rowSelection: {
            enabled: true,
            order: -2,
            before: true,
            // handle: (pluginProps,useCrudProps)=>CrudOptions,
            props: {
              multiple: true,
              crossPage: true,
              selectedRowKeys
            }
          }
        }
      },
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest
      },
      rowHandle: {
        minWidth: 200,
        fixed: "right"
      },
      columns: {
        id: {
          title: "ID",
          key: "id",
          type: "number",
          column: {
            width: 100
          },
          form: {
            show: false
          }
        },
        domain: {
          title: "域名",
          type: "text",
          editForm: {
            component: {
              disabled: true
            }
          },
          form: {
            helper: "CNAME域名一旦确定不可修改",
            rules: [{ required: true, message: "此项必填" }]
          },
          column: {
            width: 200
          }
        },
        dnsProviderType: {
          title: "DNS提供商",
          type: "dict-select",
          dict: dict({
            url: "pi/dnsProvider/list",
            value: "key",
            label: "title"
          }),
          form: {
            rules: [{ required: true, message: "此项必填" }]
          },
          column: {
            width: 150,
            component: {
              color: "auto"
            }
          }
        },
        accessId: {
          title: "DNS提供商授权",
          type: "dict-select",
          dict: dict({
            url: "/pi/access/list",
            value: "id",
            label: "name"
          }),
          form: {
            component: {
              name: "access-selector",
              vModel: "modelValue",
              type: compute(({ form }) => {
                return form.dnsProviderType;
              })
            },
            rules: [{ required: true, message: "此项必填" }]
          },
          column: {
            width: 150,
            component: {
              color: "auto"
            }
          }
        },
        isDefault: {
          title: "是否默认",
          type: "dict-switch",
          dict: dict({
            data: [
              { label: "是", value: true, color: "success" },
              { label: "否", value: false, color: "default" }
            ]
          }),
          form: {
            value: false,
            rules: [{ required: true, message: "请选择是否默认" }]
          },
          column: {
            align: "center",
            width: 100
          }
        },
        setDefault: {
          title: "设置默认",
          type: "text",
          form: {
            show: false
          },
          column: {
            width: 100,
            align: "center",
            conditionalRenderDisabled: true,
            cellRender: ({ row }) => {
              if (row.isDefault) {
                return;
              }
              const onClick = async () => {
                Modal.confirm({
                  title: "提示",
                  content: `确定要设置为默认吗？`,
                  onOk: async () => {
                    await api.SetDefault(row.id);
                    await crudExpose.doRefresh();
                  }
                });
              };

              return (
                <a-button type={"link"} size={"small"} onClick={onClick}>
                  设为默认
                </a-button>
              );
            }
          }
        },
        disabled: {
          title: "禁用/启用",
          type: "dict-switch",
          dict: dict({
            data: [
              { label: "启用", value: false, color: "success" },
              { label: "禁用", value: true, color: "error" }
            ]
          }),
          form: {
            value: false
          },
          column: {
            width: 100,
            component: {
              title: "点击可禁用/启用",
              on: {
                async click({ value, row }) {
                  Modal.confirm({
                    title: "提示",
                    content: `确定要${!value ? "禁用" : "启用"}吗？`,
                    onOk: async () => {
                      await api.SetDisabled(row.id, !value);
                      await crudExpose.doRefresh();
                    }
                  });
                }
              }
            }
          }
        },
        createTime: {
          title: "创建时间",
          type: "datetime",
          form: {
            show: false
          },
          column: {
            sorter: true,
            width: 160,
            align: "center"
          }
        },
        updateTime: {
          title: "更新时间",
          type: "datetime",
          form: {
            show: false
          },
          column: {
            show: true,
            width: 160
          }
        }
      }
    }
  };
}
