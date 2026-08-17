import * as api from "/@/views/sys/plugin/api";
import { dict, useFormWrapper } from "@fast-crud/fast-crud";
import { useI18n } from "/@/locales";
import { notification } from "ant-design-vue";

export function usePluginImport() {
  const { openCrudFormDialog } = useFormWrapper();
  const { t } = useI18n();

  async function openImportDialog(opts: any) {
    const { crudExpose } = opts;
    function createCrudOptions() {
      return {
        crudOptions: {
          columns: {
            content: {
              title: t("certd.pluginFile"),
              type: "text",
              form: {
                component: {
                  name: "pem-input",
                  vModel: "modelValue",
                  textarea: {
                    rows: 8,
                  },
                },
                col: {
                  span: 24,
                },
                helper: t("certd.selectPluginFile"),
              },
            },
            override: {
              title: t("certd.overrideSameName"),
              type: "dict-switch",
              dict: dict({
                data: [
                  {
                    value: true,
                    label: t("certd.override"),
                  },
                  {
                    value: false,
                    label: t("certd.noOverride"),
                  },
                ],
              }),
              form: {
                value: false,
                col: {
                  span: 24,
                },
                helper: t("certd.overrideHelper"),
              },
            },
          },
          form: {
            wrapper: {
              title: t("certd.importPlugin"),
              saveRemind: false,
            },
            afterSubmit() {
              notification.success({ message: t("certd.operationSuccess") });
              crudExpose.doRefresh();
            },
            async doSubmit({ form }: any) {
              return await api.ImportPlugin({
                ...form,
                type: "store",
              });
            },
          },
        },
      };
    }
    const { crudOptions } = createCrudOptions();
    await openCrudFormDialog({ crudOptions });
  }

  return {
    openImportDialog,
  };
}
