import * as api from "./api";
import { Ref, ref } from "vue";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { useI18n } from "/src/locales";

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
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
      // tabs: {
      //   name: "status",
      //   show: true,
      // },
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
            width: 80,
          },
          form: {
            show: false,
          },
        },
        domain: {
          title: t("certd.subdomainHosted"),
          type: "text",
          search: {
            show: true,
          },
          form: {
            helper: {
              render() {
                return (
                  <div>
                    <div>
                      1. {t("certd.subdomainHelpText")}
                      <a href={"https://help.aliyun.com/zh/dns/subdomain-management"} target={"_blank"}>
                        {t("certd.subdomainManagement")}
                      </a>
                    </div>
                    <div>2. {t("certd.subdomainHelpSupportStart")}</div>
                  </div>
                );
              },
            },
          },
          editForm: {
            component: {
              disabled: true,
            },
          },
        },
        disabled: {
          title: t("certd.isDisabled"),
          type: "dict-switch",
          dict: dict({
            data: [
              { value: false, label: t("certd.enabled"), color: "green" },
              { value: true, label: t("certd.disabled"), color: "gray" },
            ],
          }),
          search: {
            show: true,
          },
          form: {
            value: false,
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
          },
        },
      },
    },
  };
}
