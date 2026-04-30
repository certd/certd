import { useFormWrapper } from "@fast-crud/fast-crud";

import SiteIpCertMonitor from "./index.vue";
import { siteIpApi } from "/@/views/certd/monitor/site/ip/api";
import { useI18n } from "/@/locales";

export function useSiteIpMonitor() {
  const { openDialog, openCrudFormDialog } = useFormWrapper();
  const { t } = useI18n();

  async function openSiteIpMonitorDialog(opts: { siteId: number }) {
    await openDialog({
      wrapper: {
        title: t("monitor.siteIpMonitor"),
        width: "80%",
        is: "a-modal",
        footer: false,
        buttons: {
          cancel: {
            show: false,
          },
          reset: {
            show: false,
          },
          ok: {
            show: false,
          },
        },
        slots: {
          "form-body-top": () => {
            return <SiteIpCertMonitor siteId={opts.siteId} />;
          },
        },
      },
    });
  }

  async function openSiteIpImportDialog(opts: { afterSubmit: any; siteId: any }) {
    const { afterSubmit } = opts;
    await openCrudFormDialog<any>({
      crudOptions: {
        columns: {
          text: {
            type: "textarea",
            title: t("monitor.ipList"),
            form: {
              helper: t("monitor.ipListHelper"),
              rules: [{ required: true, message: t("monitor.enterImportIpOrDomain") }],
              component: {
                placeholder: "192.168.1.2\ncname.foo.com",
                rows: 8,
              },
              col: {
                span: 24,
              },
            },
          },
        },
        form: {
          async doSubmit({ form }) {
            return siteIpApi.Import({
              ...form,
              siteId: opts.siteId,
            });
          },
          afterSubmit,
        },
      },
    });
  }

  return {
    openSiteIpMonitorDialog,
    openSiteIpImportDialog,
  };
}
