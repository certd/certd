import { message } from "ant-design-vue";
import * as api from "./api";
import { useFormDialog } from "/@/use/use-dialog";
import { compute } from "@fast-crud/fast-crud";

export function useDomainImport() {
  const { openFormDialog } = useFormDialog();

  const columns = {
    dnsProviderType: {
      title: "域名提供商",
      type: "text",
      form: {
        component: {
          name: "dns-provider-selector",
        },
        on: {
          //@ts-ignore
          onSelectedChange: ({ form, $event }) => {
            form.dnsProviderAccessType = $event.accessType;
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

  return function openDomainImportDialog() {
    openFormDialog({
      title: "从域名提供商导入域名",
      columns: columns,
      onSubmit: async (form: any) => {
        await api.SyncSubmit({
          dnsProviderType: form.dnsProviderType,
          dnsProviderAccessId: form.dnsProviderAccessId,
        });
        message.success("导入任务已提交");
      },
    });
  };
}
