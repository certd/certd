import * as api from "./api";
import { useI18n } from "/src/locales";
import { Ref, ref } from "vue";
import { useRouter } from "vue-router";
import { AddReq, compute, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { useUserStore } from "/@/store/user";
import { useSettingStore } from "/@/store/settings";
import { Dicts } from "/@/components/plugins/lib/dicts";
import { createAccessApi } from "/@/views/certd/access/api";
import { Modal, notification } from "ant-design-vue";
import { useDomainImport } from "./use";

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

  const accessApi = createAccessApi();
  const accessDict = dict({
    value: "id",
    label: "name",
    url: "accessDict",
    async getNodesByValues(ids: number[]) {
      return await accessApi.GetDictByIds(ids);
    },
  });

  const httpUploaderTypeDict = Dicts.uploaderTypeDict;

  const dnsProviderTypeDict = dict({
    url: "pi/dnsProvider/dnsProviderTypeDict",
  });

  const openDomainImportDialog = useDomainImport();
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
      tabs: {
        name: "challengeType",
        show: true,
      },
      rowHandle: {
        minWidth: 200,
        fixed: "right",
      },
      form: {
        beforeSubmit({ form }) {
          if (form.challengeType === "cname") {
            throw new Error("CNAME方式请前往CNAME记录页面进行管理");
          }
        },
      },
      actionbar: {
        buttons: {
          add: {
            icon: "ion:add-circle-outline",
          },
          import: {
            title: "从域名提供商导入域名",
            type: "primary",
            text: "从域名提供商导入",
            needPlus: true,
            color: "gold",
            icon: "mingcute:vip-1-line",
            click: () => {
              settingStore.checkPlus();
              openDomainImportDialog({
                afterSubmit: () => {
                  setTimeout(() => {
                    crudExpose.doRefresh();
                  }, 2000);
                },
              });
            },
          },
          syncExpirationDate: {
            title: "同步域名过期时间",
            type: "primary",
            icon: "ion:refresh-outline",
            text: "同步域名过期时间",
            click: async () => {
              await api.SyncDomainsExpiration();
              notification.success({
                message: "同步任务已提交",
              });
              setTimeout(() => {
                crudExpose.doRefresh();
              }, 2000);
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
            width: 80,
            order: -999,
          },
          form: {
            show: false,
          },
        },
        domain: {
          title: t("certd.domain.domain"),
          type: "text",
          search: {
            show: true,
          },
          form: {
            required: true,
          },
          editForm: {
            component: {
              disabled: false,
            },
          },
          column: {
            sorter: true,
          },
        },
        expirationDate: {
          title: t("certd.domain.expirationDate"),
          type: "date",
          form: {
            show: false,
          },
        },
        challengeType: {
          title: t("certd.domain.challengeType"),
          type: "dict-select",
          dict: Dicts.challengeTypeDict,
          search: {
            show: true,
          },
          form: {
            required: true,
            valueChange({ value }) {
              if (value === "cname") {
                Modal.confirm({
                  title: t("certd.domain.gotoCnameTip"),
                  async onOk() {
                    router.push({
                      path: "/certd/cname/record",
                    });
                    crudExpose.getFormWrapperRef().close();
                  },
                });
              }
            },
          },
          column: {
            sorter: true,
            show: false,
          },
        },
        /**
         * challengeType varchar(50),
         *   dnsProviderType varchar(50),
         *   dnsProviderAccess bigint,
         *   httpUploaderType varchar(50),
         *   httpUploaderAccess bigint,
         *   httpUploadRootDir varchar(512),
         */
        dnsProviderType: {
          title: t("certd.domain.dnsProviderType"),
          type: "dict-select",
          dict: dnsProviderTypeDict,
          form: {
            component: {
              name: "DnsProviderSelector",
            },
            show: compute(({ form }) => {
              return form.challengeType === "dns";
            }),
            required: true,
          },
          column: {
            show: false,
            component: {
              color: "auto",
            },
          },
        },
        dnsProviderAccess: {
          title: t("certd.domain.dnsProviderAccess"),
          type: "dict-select",
          dict: accessDict,
          form: {
            component: {
              name: "AccessSelector",
              vModel: "modelValue",
              type: compute(({ form }) => {
                const type = form.dnsProviderType || "aliyun";
                return dnsProviderTypeDict?.dataMap[type]?.accessType;
              }),
            },
            show: compute(({ form }) => {
              return form.challengeType === "dns";
            }),
            required: true,
          },
          column: {
            show: false,
            component: {
              color: "auto",
            },
          },
        },
        httpUploaderType: {
          title: t("certd.domain.httpUploaderType"),
          type: "dict-select",
          dict: Dicts.uploaderTypeDict,
          form: {
            show: compute(({ form }) => {
              return form.challengeType === "http";
            }),
            required: true,
          },
          column: {
            show: false,
            component: {
              color: "auto",
            },
          },
        },
        httpUploaderAccess: {
          title: t("certd.domain.httpUploaderAccess"),
          type: "text",
          form: {
            component: {
              name: "AccessSelector",
              vModel: "modelValue",
              type: compute(({ form }) => {
                return form.httpUploaderType;
              }),
            },
            show: compute(({ form }) => {
              return form.challengeType === "http";
            }),
            required: true,
          },
          column: {
            show: false,
            component: {
              color: "auto",
            },
          },
        },
        httpUploadRootDir: {
          title: t("certd.domain.httpUploadRootDir"),
          type: "text",
          form: {
            show: compute(({ form }) => {
              return form.challengeType === "http";
            }),
            required: true,
          },
          column: {
            show: false,
            component: {
              color: "auto",
            },
          },
        },
        challengeSetting: {
          title: t("certd.domain.challengeSetting"),
          type: "text",
          form: { show: false },
          column: {
            width: 600,
            conditionalRender: false,
            cellRender({ row }) {
              if (row.challengeType === "dns") {
                return (
                  <div class={"flex"}>
                    <fs-values-format modelValue={row.challengeType} dict={Dicts.challengeTypeDict} color={"auto"}></fs-values-format>
                    <fs-values-format modelValue={row.dnsProviderType} dict={dnsProviderTypeDict} color={"auto"}></fs-values-format>
                    <fs-values-format class={"ml-5"} modelValue={row.dnsProviderAccess} dict={accessDict} color={"auto"}></fs-values-format>
                  </div>
                );
              } else if (row.challengeType === "http") {
                return (
                  <div class={"flex"}>
                    <fs-values-format modelValue={row.challengeType} dict={Dicts.challengeTypeDict} color={"auto"}></fs-values-format>
                    <fs-values-format modelValue={row.httpUploaderType} dict={httpUploaderTypeDict} color={"auto"}></fs-values-format>
                    <fs-values-format class={"ml-5"} modelValue={row.httpUploaderAccess} dict={accessDict} color={"auto"}></fs-values-format>
                    <a-tag class={"ml-5 flex items-center"}>路径：{row.httpUploadRootDir}</a-tag>
                  </div>
                );
              }
            },
          },
        },
        fromType: {
          title: t("certd.domain.fromType"),
          type: "dict-select",
          dict: Dicts.domainFromTypeDict,
          column: {
            component: {
              color: "auto",
            },
          },
        },
        disabled: {
          title: t("certd.domain.disabled"),
          type: "dict-switch",
          search: { show: true },
          dict: dict({
            data: [
              { label: t("common.enabled"), value: false, color: "green" },
              { label: t("common.disabled"), value: true, color: "red" },
            ],
          }),
          form: {
            value: false,
            required: true,
          },
          column: {
            width: 100,
            sorter: true,
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
