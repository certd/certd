import * as api from "/@/views/sys/plugin/api";
import { dict, useFormWrapper } from "@fast-crud/fast-crud";
import { useI18n } from "/@/locales";
import { notification } from "ant-design-vue";
import { usePluginStore } from "/@/store/plugin";

export function usePluginImport() {
  const { openCrudFormDialog } = useFormWrapper();
  const { t } = useI18n();
  const pluginStore = usePluginStore();

  async function openImportDialog(opts: any) {
    const { crudExpose } = opts;
    function createCrudOptions() {
      return {
        crudOptions: {
          columns: {
            content: {
              title: t("certd.sys.plugin.pluginFile"),
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
                helper: t("certd.sys.plugin.selectPluginFile"),
              },
            },
            override: {
              title: t("certd.sys.plugin.overrideSameName"),
              type: "dict-switch",
              dict: dict({
                data: [
                  {
                    value: true,
                    label: t("certd.sys.plugin.override"),
                  },
                  {
                    value: false,
                    label: t("certd.sys.plugin.noOverride"),
                  },
                ],
              }),
              form: {
                value: false,
                col: {
                  span: 24,
                },
                helper: t("certd.sys.plugin.overrideHelper"),
              },
            },
          },
          form: {
            wrapper: {
              title: t("certd.sys.plugin.importPlugin"),
              saveRemind: false,
            },
            afterSubmit() {
              notification.success({ message: t("certd.common.operationSuccess") });
              crudExpose.doRefresh();
              pluginStore.clear();
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
