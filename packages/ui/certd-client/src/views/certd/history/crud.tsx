import * as api from "./api";
import { useI18n } from "/src/locales";
import { computed, Ref, ref } from "vue";
import { useRouter } from "vue-router";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes, utils } from "@fast-crud/fast-crud";
import { useUserStore } from "/@/store/user";
import { useSettingStore } from "/@/store/settings";
import { statusUtil } from "/@/views/certd/pipeline/pipeline/utils/util.status";
import { myProjectDict } from "../dicts";
import { useProjectStore } from "/@/store/project";

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
    const res = await api.AddObj(form);
    return res;
  };

  const userStore = useUserStore();
  const settingStore = useSettingStore();
  const selectedRowKeys: Ref<any[]> = ref([]);
  context.selectedRowKeys = selectedRowKeys;

  const projectStore = useProjectStore();

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
              selectedRowKeys,
            },
          },
        },
      },
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest,
      },
      actionbar: {
        buttons: {
          add: {
            show: false,
          },
        },
      },
      search: {
        initialForm: {
          ...projectStore.getSearchForm(),
        },
        formItem: {
          labelCol: {
            style: {
              // width: "100px"
            },
          },
          wrapperCol: {
            style: {
              width: "50%",
            },
          },
        },
      },
      rowHandle: {
        minWidth: 200,
        fixed: "right",
        buttons: {
          edit: {
            show: false,
          },
          copy: { show: false },
          view: {
            async click({ row }) {
              await router.push({ path: "/certd/pipeline/detail", query: { id: row.pipelineId, historyId: row.id, editMode: "false" } });
            },
          },
        },
      },
      columns: {
        id: {
          title: "ID",
          key: "id",
          type: "number",
          column: {
            width: 100,
            order: -999,
          },
          form: {
            show: false,
          },
        },
        userId: {
          title: t("certd.fields.userId"),
          type: "number",
          search: {
            show: computed(() => {
              return userStore.isAdmin && settingStore.sysPublic.managerOtherUserPipeline;
            }),
          },
          form: {
            show: false,
          },
          column: {
            show: computed(() => {
              return userStore.isAdmin && settingStore.sysPublic.managerOtherUserPipeline;
            }),
            width: 100,
          },
        },
        pipelineId: {
          title: t("certd.fields.pipelineId"),
          type: "number",
          search: {
            show: true,
          },
          form: {
            show: false,
          },
          column: {
            width: 100,
          },
        },
        pipelineTitle: {
          title: t("certd.fields.pipelineName"),
          type: "text",
          search: {
            show: true,
          },
          column: {
            width: 300,
            tooltip: true,
            ellipsis: true,
            cellRender: ({ row, value }) => {
              return <router-link to={{ path: "/certd/pipeline/detail", query: { id: row.pipelineId, editMode: false, historyId: row.id } }}>{value}</router-link>;
            },
          },
        },
        triggerType: {
          title: t("certd.fields.triggerType"),
          type: "dict-select",
          search: {
            show: true,
          },
          dict: dict({
            data: [
              { value: "user", label: t("certd.triggerTypes.manual") },
              { value: "timer", label: t("certd.triggerTypes.timer") },
            ],
          }),
          form: {
            show: false,
            value: "custom",
          },
          column: {
            sorter: true,
            width: 90,
            align: "center",
            show: true,
            component: {
              color: "auto",
            },
          },
        },
        status: {
          title: t("certd.fields.status"),
          type: "dict-select",
          search: {
            show: true,
          },
          dict: dict({
            data: statusUtil.getOptions(),
          }),
          form: {
            show: false,
          },
          column: {
            sorter: true,
            width: 120,
            align: "center",
          },
        },
        projectId: {
          title: t("certd.fields.projectName"),
          type: "dict-select",
          dict: myProjectDict,
          form: {
            show: false,
          },
        },
        updateTime: {
          title: t("certd.fields.updateTime"),
          type: "datetime",
          form: {
            show: false,
          },
          column: {
            show: true,
          },
        },
      },
    },
  };
}
