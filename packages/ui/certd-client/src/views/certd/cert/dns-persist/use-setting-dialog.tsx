import { notification } from "ant-design-vue";
import { reactive } from "vue";
import AccessSelector from "/@/views/certd/access/access-selector/index.vue";
import DnsProviderSelector from "/@/components/plugins/cert/dns-provider-selector/index.vue";
import { useFormDialog } from "/@/use/use-dialog";
import { CreateTxt, TriggerVerify } from "./api";
import { useI18n } from "/src/locales";

export type DnsPersistSettingRecord = {
  id?: number;
  mainDomain?: string;
  hostRecord?: string;
  recordValue?: string;
  dnsProviderType?: string;
  dnsProviderAccess?: number;
};

export function useDnsPersistSettingDialog() {
  const { t } = useI18n();
  const { openFormDialog } = useFormDialog();

  function copyableRow(label: string, value?: string) {
    return (
      <div class="mb-10 flex items-center">
        <div style={{ width: "90px", flexShrink: 0 }}>{label}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <fs-copyable class="w-full" model-value={value || ""}></fs-copyable>
        </div>
      </div>
    );
  }

  async function openDnsPersistSettingDialog(req: { record: DnsPersistSettingRecord; onDone?: () => Promise<void> | void }) {
    const record = req.record;
    const form = reactive({
      mode: "manual",
      dnsProviderType: record.dnsProviderType || "",
      dnsProviderAccessType: "",
      dnsProviderAccess: record.dnsProviderAccess || null,
    });

    async function submit() {
      if (!record.id) {
        return;
      }
      if (form.mode === "manual") {
        await TriggerVerify(record.id);
        notification.success({ message: t("certd.dnsPersist.submitted") });
        await req.onDone?.();
        return;
      }
      if (!form.dnsProviderType || !form.dnsProviderAccess) {
        throw new Error(t("certd.dnsPersist.selectProviderAndAccess"));
      }
      await CreateTxt({
        id: record.id,
        dnsProviderType: form.dnsProviderType,
        dnsProviderAccess: form.dnsProviderAccess,
      });
      notification.success({ message: t("certd.dnsPersist.txtCreated") });
      await req.onDone?.();
    }

    await openFormDialog({
      title: t("certd.dnsPersist.settingTitle"),
      wrapper: {
        width: 680,
        buttons: {
          reset: {
            show: false,
          },
          ok: {
            show: true,
            text: t("certd.common.confirm"),
          },
        },
      },
      body: () => (
        <div>
          <a-radio-group value={form.mode} buttonStyle="solid" class="mb-10" onUpdate:value={(value: string) => (form.mode = value)}>
            <a-radio-button value="manual">{t("certd.dnsPersist.manualAdd")}</a-radio-button>
            <a-radio-button value="auto">{t("certd.dnsPersist.autoAdd")}</a-radio-button>
          </a-radio-group>
          {form.mode === "manual" ? (
            <div>
              <a-alert class="mb-10" type="info" show-icon message={t("certd.dnsPersist.manualTip")} />
              {copyableRow(t("certd.dnsPersist.mainDomain"), record.mainDomain)}
              {copyableRow(t("certd.dnsPersist.txtHost"), record.hostRecord)}
              {copyableRow(t("certd.dnsPersist.txtValue"), record.recordValue)}
            </div>
          ) : (
            <div>
              <a-alert class="mb-10" type="info" show-icon message={t("certd.dnsPersist.autoTip")} />
              {copyableRow(t("certd.dnsPersist.mainDomain"), record.mainDomain)}
              <div class="mb-10 flex items-center">
                <div style={{ width: "90px", flexShrink: 0 }}>{t("certd.dnsPersist.provider")}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <DnsProviderSelector
                    class="w-full"
                    style={{ width: "100%" }}
                    modelValue={form.dnsProviderType}
                    onUpdate:modelValue={(value: string) => {
                      form.dnsProviderType = value;
                      form.dnsProviderAccess = null;
                    }}
                    onSelectedChange={(option: any) => {
                      form.dnsProviderAccessType = option?.accessType || form.dnsProviderType;
                    }}
                  />
                </div>
              </div>
              <div class="mb-10 flex items-center">
                <div style={{ width: "90px", flexShrink: 0 }}>{t("certd.dnsPersist.access")}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <AccessSelector
                    modelValue={form.dnsProviderAccess}
                    type={form.dnsProviderAccessType || form.dnsProviderType || "aliyun"}
                    onUpdate:modelValue={(value: number) => {
                      form.dnsProviderAccess = value;
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ),
      onSubmit: submit,
    });
  }

  return {
    openDnsPersistSettingDialog,
  };
}
