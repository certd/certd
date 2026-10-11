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
        domain: {
          title: t("certd.sys.cname.cnameDomain"),
          type: "text",
          editForm: {
            component: {
              disabled: true,
            },
          },
          search: {
            show: true,
          },
          form: {
            component: {
              placeholder: t("certd.sys.cname.cnameDomainPlaceholder"),
            },
            helper: t("certd.sys.cname.cnameDomainHelper"),
            rules: [
              { required: true, message: t("certd.common.requiredField") },
              { pattern: /^[^*]+$/, message: t("certd.sys.cname.cnameDomainPattern") },
            ],
          },
          column: {
            width: 200,
          },
        },
        subdomain: {
          title: t("certd.sys.cname.cnameProviderSubdomain"),
          type: "text",
          form: {
            component: {
              placeholder: t("certd.sys.cname.cnameProviderSubdomainPlaceholder"),
            },
            helper: t("certd.sys.cname.cnameProviderSubdomainHelper"),
            rules: [{ pattern: /^[^*]+$/, message: t("certd.sys.cname.cnameDomainPattern") }],
          },
          column: {
            width: 200,
            show: false,
          },
        },
        dnsProviderType: {
          title: t("certd.sys.cname.dnsProvider"),
          type: "dict-select",
          search: {
            show: true,
          },
          dict: dict({
            url: "pi/dnsProvider/list",
            value: "key",
            label: "title",
          }),
          form: {
            rules: [{ required: true, message: t("certd.common.requiredField") }],
          },
          column: {
            width: 150,
            component: {
              color: "auto",
            },
          },
        },
        accessId: {
          title: t("certd.sys.cname.dnsProviderAuthorization"),
          type: "dict-select",
          dict: dict({
            url: "/sys/access/list",
            value: "id",
            label: "name",
          }),
          form: {
            component: {
              name: "access-selector",
              vModel: "modelValue",
              type: compute(({ form }) => {
                return form.dnsProviderType;
              }),
              from: "sys",
            },
            rules: [{ required: true, message: t("certd.common.requiredField") }],
          },
          column: {
            width: 150,
            component: {
              color: "auto",
            },
          },
        },
        isDefault: {
          title: t("certd.common.isDefault"),
          type: "dict-switch",
          dict: dict({
            data: [
              { label: t("certd.open.yes"), value: true, color: "success" },
              { label: t("certd.open.no"), value: false, color: "default" },
            ],
          }),
          form: {
            value: false,
            rules: [{ required: true, message: t("certd.common.selectIsDefault") }],
          },
          column: {
            align: "center",
            width: 100,
          },
        },
        setDefault: {
          title: t("certd.common.setDefault"),
          type: "text",
          form: {
            show: false,
          },
          column: {
            width: 100,
            align: "center",
            conditionalRenderDisabled: true,
            cellRender: ({ row }) => {
              if (row.isDefault) {
                return;
              }
              const onClick = async () => {
                Modal.confirm({
                  title: t("certd.common.prompt"),
                  content: t("certd.common.confirmSetDefault"),
                  onOk: async () => {
                    await api.SetDefault(row.id);
                    await crudExpose.doRefresh();
                  },
                });
              };

              return (
                <a-button type={"link"} size={"small"} onClick={onClick}>
                  {t("certd.common.setAsDefault")}
                </a-button>
              );
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
