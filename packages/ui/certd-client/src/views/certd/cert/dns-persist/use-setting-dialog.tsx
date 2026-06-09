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
        message.success("已提交校验");
        await req.onDone?.();
        return;
      }
      if (!form.dnsProviderType || !form.dnsProviderAccess) {
        throw new Error("请选择DNS服务商和授权");
      }
      await CreateTxt({
        id: record.id,
        dnsProviderType: form.dnsProviderType,
        dnsProviderAccess: form.dnsProviderAccess,
      });
      message.success("TXT记录已创建");
      await req.onDone?.();
    }

    await openFormDialog({
      title: "设置DNS TXT记录",
      wrapper: {
        width: 680,
        buttons: {
          reset: {
            show: false,
          },
          ok: {
            show: true,
            text: "确定",
          },
        },
      },
      body: () => (
        <div>
          <a-radio-group value={form.mode} buttonStyle="solid" class="mb-10" onUpdate:value={(value: string) => (form.mode = value)}>
            <a-radio-button value="manual">手动添加</a-radio-button>
            <a-radio-button value="auto">选择授权添加</a-radio-button>
          </a-radio-group>
          {form.mode === "manual" ? (
            <div>
              <a-alert class="mb-10" type="info" show-icon message="请到DNS解析控制台添加以下TXT记录，添加后点击确定会立即校验。" />
              {copyableRow("主域名", record.mainDomain)}
              {copyableRow("TXT主机名", record.hostRecord)}
              {copyableRow("TXT值", record.recordValue)}
            </div>
          ) : (
            <div>
              <a-alert class="mb-10" type="info" show-icon message="请选择DNS服务商和授权，系统会创建TXT记录，后续校验由后台完成。" />
              {copyableRow("主域名", record.mainDomain)}
              <div class="mb-10 flex items-center">
                <div style={{ width: "90px", flexShrink: 0 }}>DNS服务商</div>
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
                <div style={{ width: "90px", flexShrink: 0 }}>DNS授权</div>
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
