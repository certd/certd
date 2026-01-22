import * as api from "./api";
import { useI18n } from "/src/locales";
import { Ref, ref } from "vue";
import { useRouter } from "vue-router";
import { AddReq, compute, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { useUserStore } from "/@/store/user";
import { useSettingStore } from "/@/store/settings";
import { message, Modal } from "ant-design-vue";
import CnameTip from "/@/components/plugins/cert/domains-verify-plan-editor/cname-tip.vue";
import { useCnameImport } from "./use";
export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const crudBinding = crudExpose.crudBinding;
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

  const openCnameImportDialog = useCnameImport();

  const userStore = useUserStore();
  const settingStore = useSettingStore();
  const selectedRowKeys: Ref<any[]> = ref([]);
  context.selectedRowKeys = selectedRowKeys;

  const dictRef = dict({
    data: [
      { label: t("certd.pending_cname_setup"), value: "cname", color: "warning" },
      { label: t("certd.validating"), value: "validating", color: "blue" },
      { label: t("certd.validation_successful"), value: "valid", color: "green" },
      { label: t("certd.validation_failed"), value: "failed", color: "red" },
      { label: t("certd.validation_timed_out"), value: "timeout", color: "red" },
    ],
  });
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
          import: {
            title: "导入CNAME记录",
            type: "primary",
            text: "批量导入",
            click: () => {
              openCnameImportDialog({
                afterSubmit: () => {
                  setTimeout(() => {
                    crudExpose?.doRefresh();
                  }, 2000);
                },
              });
            },
          },
          export: {
            title: "导出CNAME记录之后，可用于批量导入cname解析到域名注册商",
            type: "primary",
            text: "批量导出",
            click: () => {
              crudBinding.value.toolbar.buttons.export.click({});
            },
          },
        },
      },
      tabs: {
        name: "status",
        show: true,
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
            width: 80,
            order: -999,
          },
          form: {
            show: false,
          },
        },
        domain: {
          title: t("certd.proxied_domain"),
          type: "text",
          search: {
            show: true,
          },
          editForm: {
            component: {
              disabled: true,
            },
          },
        },
        hostRecord: {
          title: t("certd.host_record"),
          type: "text",
          form: {
            show: false,
          },
          column: {
            width: 250,
            cellRender: ({ value }) => {
              return <fs-copyable v-model={value} />;
            },
          },
        },
        recordValue: {
          title: t("certd.please_set_cname"),
          type: "copyable",
          form: {
            show: false,
          },
          column: {
            width: 500,
          },
        },
        cnameProviderId: {
          title: t("certd.cname_service"),
          type: "dict-select",
          dict: dict({
            url: "/cname/provider/list",
            value: "id",
            label: "domain",
          }),
          form: {
            component: {
              onDictChange: ({ form, dict }: any) => {
                if (!form.cnameProviderId) {
                  const list = dict.data.filter((item: any) => {
                    return !item.disabled;
                  });
                  let item = list.find((item: any) => item.isDefault);
                  if (!item && list.length > 0) {
                    item = list[0];
                  }
                  if (item) {
                    form.cnameProviderId = item.id;
                  }
                }
              },
              renderLabel(item: any) {
                if (item.title) {
                  return `${item.domain}<${item.title}>`;
                } else {
                  return item.domain;
                }
              },
            },
            helper: {
              render() {
                const closeForm = () => {
                  crudExpose.getFormWrapperRef().close();
                };
                return (
                  <div>
                    {t("certd.default_public_cname")}
                    <router-link to={"/sys/cname/provider"} onClick={closeForm}>
                      {t("certd.customize_cname")}
                    </router-link>
                  </div>
                );
              },
            },
          },
          column: {
            width: 120,
            align: "center",
            cellRender({ value }) {
              if (value < 0) {
                return <a-tag color={"green"}>{t("certd.public_cname")}</a-tag>;
              } else {
                return <a-tag color={"blue"}>{t("certd.custom_cname")}</a-tag>;
              }
            },
          },
        },
        status: {
          title: t("certd.fields.status"),
          type: "dict-select",
          dict: dictRef,
          addForm: {
            show: false,
          },
          column: {
            width: 120,
            align: "left",
            cellRender({ value, row }) {
              async function resetStatus() {
                Modal.confirm({
                  title: "重置状态",
                  content: "确定要重置校验状态吗？",
                  onOk: async () => {
                    await api.ResetStatus(row.id);
                    await crudExpose.doRefresh();
                  },
                });
              }
              return (
                <div class={"flex flex-left"}>
                  <fs-values-format modelValue={value} dict={dictRef}></fs-values-format>
                  {row.error && (
                    <a-tooltip title={row.error}>
                      <fs-icon class={"ml-5 color-red"} icon="ion:warning-outline"></fs-icon>
                    </a-tooltip>
                  )}

                  {row.status === "valid" && (
                    <a-tooltip title={"重置校验状态，重新校验"}>
                      <fs-icon class={"ml-5 pointer "} icon="solar:undo-left-square-bold" onClick={resetStatus}></fs-icon>
                    </a-tooltip>
                  )}
                </div>
              );
            },
          },
        },
        triggerValidate: {
          title: t("certd.validate"),
          type: "text",
          form: {
            show: false,
          },
          column: {
            conditionalRenderDisabled: true,
            width: 130,
            align: "center",
            cellRender({ row, value }) {
              if (row.status === "valid") {
                return "-";
              }

              async function doVerify() {
                row._validating_ = true;
                try {
                  const res = await api.DoVerify(row.id);
                  if (res === true) {
                    message.success(t("certd.validation_successful"));
                    row.status = "valid";
                  } else if (res === false) {
                    message.success(t("certd.validation_timed_out"));
                    row.status = "timeout";
                  } else {
                    message.success(t("certd.validation_started"));
                  }
                  await crudExpose.doRefresh();
                } catch (e: any) {
                  console.error(e);
                  message.error(e.message);
                } finally {
                  row._validating_ = false;
                }
              }

              return (
                <div>
                  <a-button onClick={doVerify} loading={row._validating_} size={"small"} type={"primary"}>
                    {t("certd.click_to_validate")}
                  </a-button>
                  <CnameTip record={row} />
                </div>
              );
            },
          },
        },
        mainDomain: {
          title: t("certd.mainDomain"),
          type: "text",
          form: {
            show: false,
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
