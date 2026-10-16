import * as api from "./api.js";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { useI18n } from "/src/locales";

export default function ({ crudExpose }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { t } = useI18n();
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    const list = await api.GetTree();

    return {
      offset: 0,
      records: list,
      total: 10000,
      limit: 10000,
    };
  };

  async function afterChange() {
    await permissionTreeDict.reloadDict();
  }
  const editRequest = async ({ form, row }: EditReq) => {
    form.id = row.id;
    const ret = await api.UpdateObj(form);
    await afterChange();
    return ret;
  };
  const delRequest = async ({ row }: DelReq) => {
    const ret = await api.DelObj(row.id);
    await afterChange();
    return ret;
  };

  const addRequest = async ({ form }: AddReq) => {
    const ret = await api.AddObj(form);
    await afterChange();
    return ret;
  };
  const permissionTreeDict = dict({
    url: "/sys/authority/permission/tree",
    isTree: true,
    value: "id",
    label: "title",
    async onReady({ dict }: any) {
      dict.setData([{ id: -1, title: t("certd.sys.authority.rootNode"), children: dict.data }]);
    },
  });
  return {
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest,
      },
      actionbar: {
        show: false,
      },
      toolbar: {
        show: false,
      },
      table: {
        show: false,
        // scroll: { fixed: true }
      },
      rowHandle: {
        fixed: "right",
      },
      search: {
        show: false,
      },
      pagination: {
        show: false,
        pageSize: 100000,
      },
      columns: {
        id: {
          title: "id",
          type: "number",
          form: { show: false }, // 表单配置
          column: {
            width: 120,
            sortable: "custom",
          },
        },
        title: {
          title: t("certd.sys.authority.permissionName"),
          type: "text",
          form: {
            rules: [
              { required: true, message: t("certd.sys.authority.enterPermissionName") },
              { max: 50, message: t("certd.sys.authority.max50Chars") },
            ],
            component: {
              placeholder: t("certd.sys.authority.permissionName"),
            },
          },
          column: {
            width: 200,
          },
        },
        permission: {
          title: t("certd.sys.authority.permissionCode"),
          type: "text",
          column: {
            width: 170,
          },
          form: {
            rules: [
              { required: true, message: t("certd.sys.authority.enterPermissionCode") },
              { max: 100, message: t("certd.sys.authority.max100Chars") },
            ],
            component: {
              placeholder: t("certd.sys.authority.examplePermissionCode"),
            },
          },
        },
        sort: {
          title: t("certd.sys.authority.sortOrder"),
          type: "number",
          column: {
            width: 100,
          },
          form: {
            value: 100,
            rules: [{ required: true, type: "number", message: t("certd.sys.authority.sortRequired") }],
          },
        },
        parentId: {
          title: t("certd.sys.authority.parentNode"),
          type: "dict-tree",
          column: {
            width: 100,
          },
          dict: permissionTreeDict,
          form: {
            value: -1,
            component: {
              multiple: false,
              defaultExpandAll: true,
              dict: { cache: false },
              fieldNames: {
                value: "id",
                label: "title",
              },
            },
          },
        },
      },
    },
  };
}
