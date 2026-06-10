import { useFormWrapper, compute } from "@fast-crud/fast-crud";
import { siteInfoApi } from "./api";
import { useI18n } from "/@/locales";
import { useSettingStore } from "/@/store/settings";
import { useFormDialog } from "/@/use/use-dialog";
import GroupSelector from "../../basic/group/group-selector.vue";
import SiteInfoImportTaskStatus from "./import.vue";

export function useSiteImport() {
  const { t } = useI18n();
  const { openCrudFormDialog } = useFormWrapper();

  async function openSiteImportDialog(opts: { afterSubmit: any; defaultGroupId?: number }) {
    const { afterSubmit, defaultGroupId } = opts;
    await openCrudFormDialog<any>({
      crudOptions: {
        columns: {
          text: {
            type: "textarea",
            title: t("certd.domainList.title"),
            form: {
              helper: t("certd.domainList.helper"),
              rules: [{ required: true, message: t("certd.domainList.required") }],
              component: {
                placeholder: t("certd.domainList.placeholder"),
                rows: 8,
              },
              col: { span: 24 },
            },
          },
          groupId: {
            type: "select",
            title: t("certd.fields.group"),
            form: {
              value: defaultGroupId,
              component: {
                name: GroupSelector,
                vModel: "modelValue",
                type: "site",
              },
              col: { span: 24 },
            },
          },
        },
        form: {
          async doSubmit({ form }) {
            return siteInfoApi.Import(form);
          },
          afterSubmit,
        },
      },
    });
  }

  return { openSiteImportDialog };
}

export function useSiteImportTask() {
  const { openFormDialog } = useFormDialog();
  const { t } = useI18n();

  const columns = {
    dnsProviderType: {
      title: t("certd.domain.domainProvider"),
      type: "text",
      form: {
        component: {
          name: "dns-provider-selector",
          on: {
            selectedChange: ({ form, $event }: any) => {
              form.dnsProviderAccessType = $event.accessType;
            },
          },
        },
        valueChange({ form }: any) {
          form.dnsProviderAccessId = null;
        },
      },
    },
    dnsProviderAccessType: {
      title: t("certd.domain.domainProviderAccessType"),
      type: "text",
      form: { show: false },
    },
    dnsProviderAccessId: {
      title: t("certd.domain.domainProviderAccess"),
      type: "text",
      form: {
        component: {
          name: "access-selector",
          vModel: "modelValue",
          type: compute(({ form }: any) => form.dnsProviderAccessType || form.dnsProviderType),
        },
      },
    },
    groupId: {
      title: t("certd.fields.group"),
      type: "text",
      form: {
        component: {
          name: GroupSelector,
          vModel: "modelValue",
          type: "site",
        },
      },
    },
  };

  return function openSiteImportTaskDialog(req: { afterSubmit?: (res?: any) => void; form?: any }) {
    openFormDialog({
      title: t("certd.domain.importFromProvider"),
      columns,
      initialForm: { ...req.form },
      onSubmit: async (form: any) => {
        const res = await siteInfoApi.ImportTaskSave({
          key: form.key,
          dnsProviderType: form.dnsProviderType,
          dnsProviderAccessId: form.dnsProviderAccessId,
          groupId: form.groupId,
        });
        if (req.afterSubmit) {
          req.afterSubmit(res);
        }
      },
    });
  };
}

export function useSiteImportTaskManage() {
  const { openFormDialog } = useFormDialog();
  const { t } = useI18n();
  const settingStore = useSettingStore();
  return async function openSiteImportTaskManageDialog(req: {
    afterSubmit?: (res?: any) => void;
    form?: any;
    zIndex?: number;
  }) {
    settingStore.checkPlus();
    await openFormDialog({
      title: t("certd.domain.importFromProvider"),
      body: () => <SiteInfoImportTaskStatus />,
      zIndex: req.zIndex,
      onSubmit: async (form: any) => {
        if (req.afterSubmit) {
          req.afterSubmit(form);
        }
      },
    });
  };
}
