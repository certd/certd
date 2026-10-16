import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useFormDialog } from "/@/use/use-dialog";
import PluginAiDevDialogBody from "./components/plugin-ai-dev-dialog-body.vue";

export type PluginAiDevOpenOptions = {
  pluginId?: number | string;
  pluginName?: string;
};

export function usePluginAiDev() {
  const { openFormDialog } = useFormDialog();
  const { t } = useI18n();

  async function openAiDevDialog(options: PluginAiDevOpenOptions = {}) {
    const bodyRef = ref();
    await openFormDialog({
      title: t("certd.sys.plugin.aiDevTitle"),
      columns: {},
      noneForm: true,
      wrapper: {
        width: 980,
        destroyOnClose: true,
        maskClosable: true,
        footer: null,
        buttons: {
          copy: { show: false },
          cancel: { show: false },
          reset: { show: false },
          ok: { show: false },
        },
        class: "plugin-ai-dev-dialog",
      },
      body: () => <PluginAiDevDialogBody ref={bodyRef} pluginId={options.pluginId} pluginName={options.pluginName} />,
    });
  }

  return {
    openAiDevDialog,
  };
}
