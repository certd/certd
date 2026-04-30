import { message } from "ant-design-vue";
import * as api from "./api";
import { useFormDialog } from "/@/use/use-dialog";
import { compute } from "@fast-crud/fast-crud";
import { Dicts } from "/@/components/plugins/lib/dicts";
import { useSettingStore } from "/@/store/settings";
import DomainImportTaskStatus from "./import.vue";
import { useI18n } from "/@/locales";
export function useDomainImport() {
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
            //@ts-ignore
            selectedChange: ({ form, $event }) => {
              form.dnsProviderAccessType = $event.accessType;
            },
          },
        },
        //@ts-ignore
        valueChange({ form }) {
          form.dnsProviderAccessId = null;
        },
      },
    },
    dnsProviderAccessType: {
      title: t("certd.domain.domainProviderAccessType"),
      type: "text",
      form: {
        show: false,
      },
    },
    dnsProviderAccessId: {
      title: t("certd.domain.domainProviderAccess"),
      type: "text",
      form: {
        component: {
          name: "access-selector",
          vModel: "modelValue",
          type: compute(({ form }) => {
            return form.dnsProviderAccessType || form.dnsProviderType;
          }),
        },
      },
    },
  };

  return function openDomainImportDialog(req: { afterSubmit?: (res?: any) => void; form?: any }) {
    openFormDialog({
      title: t("certd.domain.importFromProvider"),
      columns: columns,
      initialForm: {
        ...req.form,
      },
      onSubmit: async (form: any) => {
        const res = await api.ImportTaskSave({
          key: form.key,
          dnsProviderType: form.dnsProviderType,
          dnsProviderAccessId: form.dnsProviderAccessId,
        });
        if (req.afterSubmit) {
          req.afterSubmit(res);
        }
      },
    });
  };
}

export function useDomainImportManage() {
  const { openFormDialog } = useFormDialog();
  const { t } = useI18n();
  const settingStore = useSettingStore();
  return async function openDomainImportManageDialog(req: { afterSubmit?: (res?: any) => void; form?: any; zIndex?: number }) {
    await openFormDialog({
      title: t("certd.domain.importFromProvider"),
      body: () => {
        return <DomainImportTaskStatus />;
      },
      zIndex: req.zIndex,
      onSubmit: async (form: any) => {
        if (req.afterSubmit) {
          req.afterSubmit(form);
        }
      },
    });
  };
}
