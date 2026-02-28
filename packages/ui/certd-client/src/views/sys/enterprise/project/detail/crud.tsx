import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { Modal } from "ant-design-vue";
import { Ref, ref } from "vue";
import { useRouter } from "vue-router";
import * as api from "./api";
import { useSettingStore } from "/@/store/settings";
import { useUserStore } from "/@/store/user";
import { useI18n } from "/src/locales";
import { userDict } from "../../dicts";
import { useDicts } from "/@/views/certd/dicts";

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

  const projectId = context.projectId;

  const userStore = useUserStore();
  const settingStore = useSettingStore();
  const selectedRowKeys: Ref<any[]> = ref([]);
  context.selectedRowKeys = selectedRowKeys;

  const { projectMemberStatusDict } = useDicts();

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
      search: {
        initialForm: {
          projectId,
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
        projectId: {
          title: "项目ID",
          type: "text",
          search: {
            show: false,
          },
          form: {
            value: projectId,
            show: false,
          },
          editForm: {
            show: false,
          },
          column: {
            width: 200,
            show: false,
          },
        },
        userId: {
          title: "用户",
          type: "dict-select",
          dict: userDict,
          search: {
            show: true,
          },
          form: {},
          editForm: {
            show: false,
          },
          column: {
            width: 200,
          },
        },
        permission: {
          title: t("certd.ent.projectPermission"),
          type: "dict-select",
          dict: dict({
            data: [
              { label: t("certd.ent.permission.read"), value: "read", color: "cyan" },
              { label: t("certd.ent.permission.write"), value: "write", color: "blue" },
              { label: t("certd.ent.permission.admin"), value: "admin", color: "green" },
            ],
          }),
          search: {
            show: true,
          },
          form: {
            show: true,
          },
          column: {
            width: 200,
          },
        },
        status: {
          title: t("certd.ent.projectMemberStatus"),
          type: "dict-select",
          dict: projectMemberStatusDict,
          search: {
            show: true,
          },
          form: {
            show: true,
          },
          column: {
            width: 200,
            cellRender: ({ row }) => {
              return (
                <div class="flex items-center">
                  <fs-values-format model-value={row.status} dict={projectMemberStatusDict}></fs-values-format>
                </div>
              );
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
