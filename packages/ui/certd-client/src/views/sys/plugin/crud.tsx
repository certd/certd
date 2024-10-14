import * as api from "./api";
import { useI18n } from "vue-i18n";
import { computed, Ref, ref } from "vue";
import { useRouter } from "vue-router";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes, utils } from "@fast-crud/fast-crud";
import { useUserStore } from "/src/store/modules/user";
import { useSettingStore } from "/src/store/modules/settings";
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
      actionbar: {
        buttons: {
          add: {
            show: false
          }
        }
      },
      rowHandle: {
        show: false,
        minWidth: 200,
        fixed: "right",
        buttons: {
          edit: {
            show: false
          },
          copy: {
            show: false
          },
          remove: {
            show: false
          }
        }
      },
      table: {
        rowKey: "name"
      },
      columns: {
        // id: {
        //   title: "ID",
        //   key: "id",
        //   type: "number",
        //   column: {
        //     width: 100
        //   },
        //   form: {
        //     show: false
        //   }
        // },
        name: {
          title: "插件名称",
          type: "text",
          search: {
            show: true
          },
          form: {
            show: false
          },
          column: {
            width: 200
          }
        },
        icon: {
          title: "图标",
          type: "text",
          form: {
            show: false
          },
          column: {
            width: 100,
            align: "center",
            component: {
              name: "fs-icon",
              vModel: "icon",
              style: {
                fontSize: "22px"
              }
            }
          }
        },
        title: {
          title: "标题",
          type: "text",
          column: {
            width: 300
          }
        },
        desc: {
          title: "描述",
          type: "text",
          column: {
            width: 300
          }
        },
        group: {
          title: "分组",
          type: "text",
          column: {
            width: 100,
            align: "center"
          }
        },
        disabled: {
          title: "点击禁用/启用",
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
            width: 120,
            align: "center",
            component: {
              title: "点击可禁用/启用",
              on: {
                async click({ value, row }) {
                  Modal.confirm({
                    title: "提示",
                    content: `确定要${!value ? "禁用" : "启用"}吗？`,
                    onOk: async () => {
                      await api.SetDisabled({
                        id: row.id,
                        name: row.name,
                        type: row.type,
                        disabled: !value
                      });
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
            show: true
          }
        }
      }
    }
  };
}
