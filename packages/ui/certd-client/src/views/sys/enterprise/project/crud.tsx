import * as api from "./api";
import { useI18n } from "/src/locales";
import { computed, Ref, ref } from "vue";
import { useRouter } from "vue-router";
import { AddReq, compute, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes, utils } from "@fast-crud/fast-crud";
import { useUserStore } from "/@/store/user";
import { useSettingStore } from "/@/store/settings";
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
          title: t("certd.ent.projectName"),
          type: "link",
          search: {
            show: true,
          },
          form: {
            component: {},
            helper: t("certd.ent.projectNameHelper"),
            rules: [{ required: true, message: t("certd.requiredField") }],
          },
          column: {
            width: 200,
            cellRender({ row }) {
              return (
                <router-link to={`/sys/enterprise/project/member`} query={{ projectId: row.id }}>
                  {row.name}
                </router-link>
              );
            },
          },
        },
        disabled: {
          title: t("certd.disabled"),
          type: "dict-switch",
          dict: dict({
            data: [
              { label: t("certd.enabled"), value: false, color: "success" },
              { label: t("certd.disabledLabel"), value: true, color: "error" },
            ],
          }),
          form: {
            value: false,
          },
          column: {
            width: 100,
            component: {
              title: t("certd.clickToToggle"),
              on: {
                async click({ value, row }) {
                  Modal.confirm({
                    title: t("certd.prompt"),
                    content: t("certd.confirmToggleStatus", { action: !value ? t("certd.disable") : t("certd.enable") }),
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
