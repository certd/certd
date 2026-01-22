import { dict } from "@fast-crud/fast-crud";
import { message } from "ant-design-vue";
import * as api from "./api";
import { useFormDialog } from "/@/use/use-dialog";

export const cnameProviderDict = dict({
  url: "/cname/provider/list",
  value: "id",
  label: "domain",
});
export function useCnameImport() {
  const { openFormDialog } = useFormDialog();

  const columns = {
    domainList: {
      title: "域名列表",
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
        helper: "每个域名一行，批量导入\n泛域名请去掉*.\n已经存在的会自动跳过",
      },
    },
    cnameProviderId: {
      title: "CNAME服务",
      type: "dict-select",
      dict: cnameProviderDict,
      form: {
        required: true,
      },
    },
  };

  return function openCnameImportDialog(req: { afterSubmit?: () => void }) {
    openFormDialog({
      title: "导入CNAME记录",
      columns: columns,
      onSubmit: async (form: any) => {
        await api.Import({
          domainList: form.domainList,
          cnameProviderId: form.cnameProviderId,
        });
        message.success("导入任务已提交");
        if (req.afterSubmit) {
          req.afterSubmit();
        }
      },
    });
  };
}
