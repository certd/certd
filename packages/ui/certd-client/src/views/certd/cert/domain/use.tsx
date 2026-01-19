import * as api from "./api";
import { useFormDialog } from "/@/use/use-dialog";

export function useDomainImport() {
  const { openFormDialog } = useFormDialog();

  const columns = {
    dnsProviderType: {
      title: "域名提供商",
      type: "select",
    },
    dnsProviderAccessId: {
      title: "域名提供商访问ID",
      type: "input",
    },
  };

  return function openDomainImportDialog() {
    openFormDialog({
      title: "从域名提供商导入域名",
      columns: columns,
      onSubmit: async (form: any) => {
        await api.Save({
          title: form.title,
        });
      },
    });
  };
}
