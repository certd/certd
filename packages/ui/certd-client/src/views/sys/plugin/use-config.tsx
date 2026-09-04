import * as api from "/@/views/sys/plugin/api";
import { useFormWrapper } from "@fast-crud/fast-crud";
import { useI18n } from "/@/locales";
import { notification } from "ant-design-vue";
import ConfigEditor from "./config-editor.vue";
import { ref } from "vue";
import { usePluginStore } from "/@/store/plugin";

export function usePluginConfig() {
  const { openCrudFormDialog } = useFormWrapper();
  const { t } = useI18n();

  const pluginStore = usePluginStore();
  // @ts-ignore
  async function openConfigDialog({ row, onSuccess }) {
    const configEditorRef = ref();
    function createCrudOptions() {
      return {
        crudOptions: {
          columns: {},
          form: {
            wrapper: {
              width: "80%",
              title: "插件参数自定义",
              saveRemind: false,
              slots: {
                "form-body-top": () => {
                  return (
                    <div>
                      <ConfigEditor ref={configEditorRef} plugin={row}></ConfigEditor>
                    </div>
                  );
                },
              },
            },
            async afterSubmit() {
              notification.success({ message: t("certd.operationSuccess") });
              if (onSuccess) {
                await onSuccess();
              }
            },
            async doSubmit({}: any) {
              const form = configEditorRef.value.getForm();
              const newForm: any = {};
              for (const key in form) {
                const value = form[key];
                if (value && Object.keys(value).length > 0) {
                  newForm[key] = value;
                }
              }
              const res = await api.savePluginSetting({
                name: row.fullName || row.name,
                sysSetting: {
                  metadata: {
                    input: newForm,
                  },
                },
                type: row.type,
              });
              await pluginStore.clear();
              return res;
            },
          },
        },
      };
    }
    const { crudOptions } = createCrudOptions();
    await openCrudFormDialog({ crudOptions });

    // modal.confirm({
    //   title: "插件元数据配置",
    //   width: "80%",
    //   content: () => {
    //     return <ConfigEditor plugin={row}></ConfigEditor>;
    //   },
    // });
  }

  return {
    openConfigDialog,
  };
}
