import { message } from "ant-design-vue";
import * as api from "./api";
import { useFormDialog } from "/@/use/use-dialog";
import { compute } from "@fast-crud/fast-crud";
import { Dicts } from "/@/components/plugins/lib/dicts";
import { useSettingStore } from "/@/store/settings";
import DomainImportTaskStatus from "./import.vue";
export function useDomainImport() {
  const { openFormDialog } = useFormDialog();

  const columns = {
    dnsProviderType: {
      title: "域名提供商",
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
      title: "域名提供商访问类型",
      type: "text",
      form: {
        show: false,
      },
    },
    dnsProviderAccessId: {
      title: "域名提供商授权",
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
      title: "从域名提供商导入域名",
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
  const settingStore = useSettingStore();
  return async function openDomainImportManageDialog(req: { afterSubmit?: (res?: any) => void; form?: any; zIndex?: number }) {
    await openFormDialog({
      title: "从域名提供商导入域名",
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
