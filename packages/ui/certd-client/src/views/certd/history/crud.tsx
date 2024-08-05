import * as api from "./api";
import { useI18n } from "vue-i18n";
import { computed, Ref, ref } from "vue";
import { useRouter } from "vue-router";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, EditReq, UserPageQuery, UserPageRes, utils } from "@fast-crud/fast-crud";
import { useUserStore } from "/@/store/modules/user";
import { useSettingStore } from "/@/store/modules/settings";

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
        minWidth: 200,
        fixed: "right",
        buttons: {
          edit: {
            show: false
          }
        }
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
        userId: {
          title: "用户Id",
          type: "number",
          search: {
            show: computed(() => {
              return userStore.isAdmin && settingStore.sysPublic.managerOtherUserPipeline;
            })
          },
          form: {
            show: false
          },
          column: {
            show: computed(() => {
              return userStore.isAdmin && settingStore.sysPublic.managerOtherUserPipeline;
            })
          }
        },
        pipelineId: {
          title: "流水线Id",
          type: "number",
          search: {
            show: true
          },
          form: {
            show: false
          }
        },
        pipelineTitle: {
          title: "流水线名称",
          type: "link",
          search: {
            show: true,
            component: {
              name: "a-input"
            }
          },
          column: {
            width: 200
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
            width: 125,
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
