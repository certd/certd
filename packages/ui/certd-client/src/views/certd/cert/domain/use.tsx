import { compute } from "@fast-crud/fast-crud";
import { Ref, ref } from "vue";
import * as api from "./api";
import DomainImportTaskStatus from "./import.vue";
import { useI18n } from "/@/locales";
import { useSettingStore } from "/@/store/settings";
import { useFormDialog } from "/@/use/use-dialog";
export function useDomainImport() {
  const { openFormDialog } = useFormDialog();
  const { t } = useI18n();

  const columns = {
    dnsProviderType: {
      title: t("certd.domain.domainProvider"),
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
      title: t("certd.domain.domainProviderAccessType"),
      type: "text",
      form: {
        show: false,
      },
    },
    dnsProviderAccessId: {
      title: t("certd.domain.domainProviderAccess"),
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
      title: t("certd.domain.importFromProvider"),
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
  const { t } = useI18n();
  const settingStore = useSettingStore();
  return async function openDomainImportManageDialog(req: { afterSubmit?: (res?: any) => void; form?: any; zIndex?: number }) {
    await openFormDialog({
      title: t("certd.domain.importFromProvider"),
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

export function useSyncExpirationProcess(opts: { crudExpose: any }) {
  const { openFormDialog } = useFormDialog();
  const { t } = useI18n();

  return async function openSyncExpirationProcessDialog() {
    const taskStatus: Ref<any> = ref({});
    const errors: Ref<string[]> = ref([]);
    const timerRef: Ref<any> = ref(null);

    function stop() {
      if (timerRef.value) {
        clearTimeout(timerRef.value);
        timerRef.value = null;
      }
    }

    async function loadStatus() {
      const status = await api.SyncExpirationStatus();
      taskStatus.value = status || {};
      errors.value = taskStatus.value.errors || [];

      if (taskStatus.value.status === "running") {
        stop();
        timerRef.value = setTimeout(async () => {
          await loadStatus();
        }, 3000);
      } else {
        stop();
        await opts.crudExpose.doRefresh();
      }
    }

    await loadStatus();

    await openFormDialog({
      title: t("certd.domain.syncExpirationProgress"),
      body: () => {
        const progress = Math.min(Math.round(taskStatus.value.progress || 0), 100);
        const isRunning = taskStatus.value.status === "running";
        const errorList = errors.value.map(item => {
          return <div>{item}</div>;
        });
        return (
          <div class={"w-full"}>
            <div class={"mt-4 flex flex-wrap gap-2"}>
              <a-tag color={isRunning ? "processing" : "success"}>{isRunning ? t("certd.domain.running") : t("certd.domain.done")}</a-tag>

              <a-tag class={"m-0"} color={"blue"}>
                {t("certd.domain.total")}：{taskStatus.value.total || 0}
              </a-tag>
              <a-tag class={"m-0"} color={"green"}>
                {t("certd.success")}：{taskStatus.value.successCount || 0}
              </a-tag>
              <a-tag class={"m-0"} color={"red"}>
                {t("certd.domain.failed")}：{taskStatus.value.errorCount || 0}
              </a-tag>
              <a-tag class={"m-0"} color={"cyan"}>
                {t("certd.domain.current")}：{taskStatus.value.current || 0}
              </a-tag>
            </div>
            <div class={"mt-4 pr-4"}>
              <a-progress percent={progress} status={errors.value.length > 0 ? "exception" : isRunning ? "active" : "success"} />
            </div>
            {errors.value.length > 0 && <div class={"mt-2 break-words text-red-500 mb-4"}>{errorList}</div>}
          </div>
        );
      },
      wrapper: {
        width: 600,
        footer: false,
        buttons: {
          cancel: {
            show: false,
          },
          reset: {
            show: false,
          },
          ok: {
            show: true,
          },
        },
        onClosed() {
          stop();
        },
      },
    });
  };
}
