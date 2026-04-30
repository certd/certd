import { dict } from "@fast-crud/fast-crud";
import { message } from "ant-design-vue";
import * as api from "./api";
import { useFormDialog } from "/@/use/use-dialog";
import { useI18n } from "/@/locales";

export const cnameProviderDict = dict({
  url: "/cname/provider/list",
  value: "id",
  label: "domain",
});
export function useCnameImport() {
  const { openFormDialog } = useFormDialog();
  const { t } = useI18n();

  const columns = {
    domainList: {
      title: t("certd.cname.domainList"),
      type: "text",
      form: {
        component: {
          name: "a-textarea",
          rows: 5,
        },
        col: {
          span: 24,
        },
        required: true,
        helper: t("certd.cname.domainListHelper"),
      },
    },
    cnameProviderId: {
      title: t("certd.cname.cnameService"),
      type: "dict-select",
      dict: cnameProviderDict,
      form: {
        required: true,
      },
    },
  };

  return function openCnameImportDialog(req: { afterSubmit?: () => void }) {
    openFormDialog({
      title: t("certd.cname.importRecords"),
      columns: columns,
      onSubmit: async (form: any) => {
        await api.Import({
          domainList: form.domainList,
          cnameProviderId: form.cnameProviderId,
        });
        message.success(t("certd.cname.importTaskSubmitted"));
        if (req.afterSubmit) {
          req.afterSubmit();
        }
      },
    });
  };
}
