import { message } from "ant-design-vue";
import { reactive } from "vue";
import AccessSelector from "/@/views/certd/access/access-selector/index.vue";
import DnsProviderSelector from "/@/components/plugins/cert/dns-provider-selector/index.vue";
import { useFormDialog } from "/@/use/use-dialog";
import { CreateTxt, TriggerVerify } from "./api";

export type DnsPersistSettingRecord = {
  id?: number;
  mainDomain?: string;
  hostRecord?: string;
  recordValue?: string;
  dnsProviderType?: string;
  dnsProviderAccess?: number;
};

export function useDnsPersistSettingDialog() {
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
        message.success("Validation submitted");
        await req.onDone?.();
        return;
      }
      if (!form.dnsProviderType || !form.dnsProviderAccess) {
        throw new Error("Select a DNS provider and authorization");
      }
      await CreateTxt({
        id: record.id,
        dnsProviderType: form.dnsProviderType,
        dnsProviderAccess: form.dnsProviderAccess,
      });
      message.success("TXT record created");
      await req.onDone?.();
    }

    await openFormDialog({
      title: "Set DNS TXT record",
      wrapper: {
        width: 680,
        buttons: {
          reset: {
            show: false,
          },
          ok: {
            show: true,
            text: "Confirm",
          },
        },
      },
      body: () => (
        <div>
          <a-radio-group value={form.mode} buttonStyle="solid" class="mb-10" onUpdate:value={(value: string) => (form.mode = value)}>
            <a-radio-button value="manual">Add manually</a-radio-button>
            <a-radio-button value="auto">Add with authorization</a-radio-button>
          </a-radio-group>
          {form.mode === "manual" ? (
            <div>
              <a-alert class="mb-10" type="info" show-icon message="Add the TXT record below in your DNS console, then click Confirm to validate immediately." />
              {copyableRow("Main domain", record.mainDomain)}
              {copyableRow("TXT hostname", record.hostRecord)}
              {copyableRow("TXT value", record.recordValue)}
            </div>
          ) : (
            <div>
              <a-alert class="mb-10" type="info" show-icon message="Select a DNS provider and authorization. The system will create the TXT record and complete validation in the background." />
              {copyableRow("Main domain", record.mainDomain)}
              <div class="mb-10 flex items-center">
                <div style={{ width: "90px", flexShrink: 0 }}>DNS provider</div>
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
                <div style={{ width: "90px", flexShrink: 0 }}>DNS authorization</div>
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
