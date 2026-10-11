import * as api from "./api";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { useI18n } from "/src/locales";

export default function ({ crudExpose, context: { authz } }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { t } = useI18n();
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetList(query);
  };
  const editRequest = async ({ form, row }: EditReq) => {
    form.id = row.id;
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
        delRequest,
      },
      rowHandle: {
        width: 300,
        buttons: {
          authz: {
            type: "link",
            text: "授权",
            async click(context) {
              await authz.authzOpen(context.record.id);
            },
          },
        },
      },
      columns: {
        id: {
          title: "id",
          type: "text",
          form: { show: false }, // 表单配置
          column: {
            width: 70,
            sorter: true,
          },
        },
        name: {
          title: t("certd.sys.authority.roleName"),
          type: "text",
          search: { show: true },
          form: {
            rules: [
              { required: true, message: t("certd.sys.authority.enterRoleName") },
              { max: 50, message: t("certd.sys.authority.max50Chars") },
            ],
          }, // 表单配置
          column: {
            sorter: true,
          },
        },
        createTime: {
          title: t("certd.common.createTime"),
          type: "datetime",
          column: {
            sorter: true,
          },
          form: {
            show: false,
          },
        },
        updateTime: {
          title: t("certd.common.updateTime"),
          type: "datetime",
          column: {
            sorter: true,
          },
          form: { show: false }, // 表单配置
        },
      },
    },
  };
}
