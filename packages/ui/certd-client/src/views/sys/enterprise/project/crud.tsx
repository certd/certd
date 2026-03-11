import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { Modal } from "ant-design-vue";
import { Ref, ref } from "vue";
import { useRouter } from "vue-router";
import { userDict } from "../dicts";
import * as api from "./api";
import { useSettingStore } from "/@/store/settings";
import { useUserStore } from "/@/store/user";
import { useI18n } from "/src/locales";
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
  const projectStore = useProjectStore();
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
      rowHandle: {
        minWidth: 200,
        fixed: "right",
      },
      form: {
        onSuccess: async () => {
          await projectStore.reload();
          crudExpose?.doRefresh();
        },
      },
      columns: {
        id: {
          title: "ID",
          key: "id",
          type: "number",
          column: {
            width: 100,
          },
          form: {
            show: false,
          },
        },
        name: {
          title: t("certd.ent.projectName"),
          type: "link",
          search: {
            show: true,
          },
          form: {
            component: {},
            rules: [{ required: true, message: t("certd.requiredField") }],
          },
          column: {
            width: 200,
            cellRender({ row }) {
              return <router-link to={{ path: `/sys/enterprise/project/detail`, query: { projectId: row.id } }}>{row.name}</router-link>;
            },
          },
        },
        isSystem: {
          title: t("certd.ent.isSystem"),
          type: "dict-switch",
          dict: dict({
            data: [
              { label: t("common.yes"), value: true, color: "success" },
              { label: t("common.no"), value: false, color: "error" },
            ],
          }),
          form: {
            value: true,
            helper: t("certd.ent.isSystemHelper"),
          },
          column: {
            width: 150,
          },
        },
        adminId: {
          title: t("certd.fields.adminId"),
          type: "dict-select",
          dict: userDict,
          column: {
            width: 160,
          },
        },
        createTime: {
          title: t("certd.createTime"),
          type: "datetime",
          form: {
            show: false,
          },
          column: {
            sorter: true,
            width: 160,
            align: "center",
          },
        },
        updateTime: {
          title: t("certd.updateTime"),
          type: "datetime",
          form: {
            show: false,
          },
          column: {
            show: true,
            width: 160,
          },
        },
      },
    },
  };
}
