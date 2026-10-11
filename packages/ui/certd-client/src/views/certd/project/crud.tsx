import * as api from "./api";
import { useI18n } from "/src/locales";
import { computed, Ref, ref } from "vue";
import { useRouter } from "vue-router";
import { AddReq, compute, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes, utils } from "@fast-crud/fast-crud";
import { useUserStore } from "/@/store/user";
import { useSettingStore } from "/@/store/settings";
import { Modal } from "ant-design-vue";
import { userDict } from "../../sys/enterprise/dicts";

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const router = useRouter();
  const { t } = useI18n();
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    const list = await api.GetList(query);

    return {
      records: list,
      total: list.length,
      offset: 0,
      limit: 999,
    };
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
          title: t("certd.project.ent.projectName"),
          type: "link",
          search: {
            show: true,
          },
          form: {
            component: {},
            rules: [{ required: true, message: t("certd.common.requiredField") }],
          },
          column: {
            width: 200,
            cellRender({ row }) {
              return <router-link to={{ path: `/cert/project/detail`, query: { projectId: row.id } }}>{row.name}</router-link>;
            },
          },
        },
        disabled: {
          title: t("certd.common.disabled"),
          type: "dict-switch",
          dict: dict({
            data: [
              { label: t("certd.common.enabled"), value: false, color: "success" },
              { label: t("certd.common.disabledLabel"), value: true, color: "error" },
            ],
          }),
          form: {
            value: false,
          },
          column: {
            width: 100,
            component: {
              title: t("certd.common.clickToToggle"),
              on: {
                async click({ value, row }) {
                  Modal.confirm({
                    title: t("certd.common.prompt"),
                    content: t("certd.common.confirmToggleStatus", { action: !value ? t("certd.common.disable") : t("certd.common.enable") }),
                    onOk: async () => {
                      await api.SetDisabled(row.id, !value);
                      await crudExpose.doRefresh();
                    },
                  });
                },
              },
            },
          },
        },
        adminId: {
          title: t("certd.common.fields.adminId"),
          type: "dict-select",
          dict: userDict,
          column: {
            width: 160,
          },
        },
        createTime: {
          title: t("certd.common.createTime"),
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
          title: t("certd.common.updateTime"),
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
