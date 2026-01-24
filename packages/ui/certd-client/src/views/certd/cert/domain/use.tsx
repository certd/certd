import { message } from "ant-design-vue";
import * as api from "./api";
import { useFormDialog } from "/@/use/use-dialog";
import { compute } from "@fast-crud/fast-crud";
import { Dicts } from "/@/components/plugins/lib/dicts";

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
              form.dnsProviderTitle = $event.label;
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
          on: {
            //@ts-ignore
            selectedChange({ form, $event }) {
              form.accessTitle = $event.name;
            },
          },
        },
      },
    },
  };

  return function openDomainImportDialog(req: { afterSubmit?: () => void }) {
    openFormDialog({
      title: "从域名提供商导入域名",
      columns: columns,
      onSubmit: async (form: any) => {
        await api.ImportTaskAdd({
          dnsProviderType: form.dnsProviderType,
          dnsProviderAccessId: form.dnsProviderAccessId,
          title: form.dnsProviderTitle + "_" + form.accessTitle,
        });
        if (req.afterSubmit) {
          req.afterSubmit();
        }
      },
    });
  };
}
