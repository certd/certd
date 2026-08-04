import { AddReq, compute, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { message, Modal, notification } from "ant-design-vue";
import * as api from "./api";
import { Dicts } from "/@/components/plugins/lib/dicts";
import { createAccessApi } from "/@/views/certd/access/api";
import { useDnsPersistSettingDialog } from "./use-setting-dialog";

function parseAccount(account: any) {
  if (!account) {
    return null;
  }
  if (typeof account === "string") {
    return JSON.parse(account);
  }
  return account;
}

export default function ({ crudExpose }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const accessApi = createAccessApi();
  const { openDnsPersistSettingDialog } = useDnsPersistSettingDialog();
  const accessDict = dict({
    value: "id",
    label: "name",
    url: "accessDict",
    async getNodesByValues(ids: number[]) {
      return await accessApi.GetDictByIds(ids);
    },
  });

  const dnsProviderTypeDict = dict({
    url: "pi/dnsProvider/dnsProviderTypeDict",
  });
  const statusDict = dict({
    data: [
      { value: "pending", label: "Pending setup", color: "warning" },
      { value: "created", label: "Created", color: "blue" },
      { value: "validating", label: "Validating", color: "blue" },
      { value: "valid", label: "Valid", color: "green" },
      { value: "failed", label: "Retry required", color: "red" },
    ],
  });

  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetList(query);
  };
  const editRequest = async ({ form, row }: EditReq) => {
    form.id = row.id;
    return await api.UpdateObj(form);
  };
  const delRequest = async ({ row }: DelReq) => {
    const res = await api.DelObj(row.id);
    if (res?.message) {
      notification.warning({
        message: "Delete the TXT record at the provider",
        description: res.message,
        duration: 0,
      });
    }
    return res;
  };
  const addRequest = async ({ form }: AddReq) => {
    return await api.AddObj(form);
  };

  async function fillRecord(form: any) {
    if (!form.domain || !form.acmeAccountAccessId) {
      return;
    }
    const access: any = await accessApi.GetObj(form.acmeAccountAccessId);
    const setting = JSON.parse(access.setting || "{}");
    const account = parseAccount(setting.account);
    if (!account?.accountUri) {
      message.error("The ACME account authorization is missing accountUri. Regenerate the account");
      return;
    }
    const record = await api.BuildRecord({
      domain: form.domain,
      accountUri: account.accountUri,
      wildcard: true,
      persistUntil: form.persistUntil,
    });
    form.caType = account.caType;
    form.accountUri = account.accountUri;
    form.hostRecord = record.hostRecord;
    form.recordValue = record.recordValue;
    form.status = "pending";
  }

  async function verifyRecord(row: any) {
    const ok = await api.Verify(row.id);
    message[ok ? "success" : "error"](ok ? "Validation succeeded" : "No matching TXT record found. Try again later");
    await crudExpose.doRefresh();
    return ok;
  }

  function showRecordHelp(row: any) {
    openDnsPersistSettingDialog({
      record: row,
      async onDone() {
        await crudExpose.doRefresh();
      },
    });
  }

  return {
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest,
      },
      actionbar: {
        buttons: {
          add: {
            icon: "ion:add-circle-outline",
          },
        },
      },
      rowHandle: {
        minWidth: 120,
        fixed: "right",
      },
      columns: {
        id: {
          title: "ID",
          key: "id",
          type: "number",
          column: { width: 80, order: -999 },
          form: { show: false },
        },
        domain: {
          title: "Domain",
          type: "text",
          search: { show: true },
          form: {
            required: true,
            valueChange({ form }) {
              fillRecord(form);
            },
          },
        },
        mainDomain: {
          title: "Main domain",
          type: "text",
          form: {
            show: false,
          },
          column: {
            width: 160,
            order: 901,
          },
        },
        wildcard: {
          title: "Wildcard",
          type: "dict-switch",
          form: {
            show: false,
            value: true,
          },
          column: { show: false },
        },
        acmeAccountAccessId: {
          title: "ACME account authorization",
          type: "dict-select",
          dict: accessDict,
          form: {
            required: true,
            order: -9,
            component: {
              name: "AccessSelector",
              vModel: "modelValue",
              type: "acmeAccount",
              subtype: compute(({ form }) => {
                return form.caType;
              }),
            },
            valueChange({ form }) {
              fillRecord(form);
            },
          },
          column: {
            width: 220,
          },
        },
        caType: {
          title: "Issuer",
          type: "dict-select",
          dict: Dicts.sslProviderDict,
          form: {
            required: true,
            value: "letsencrypt",
            order: -10,
            valueChange({ form }) {
              form.acmeAccountAccessId = null;
              fillRecord(form);
            },
          },
          column: { width: 120 },
        },
        persistUntil: {
          title: "Valid until",
          type: "datetime",
          form: {
            helper: "Optional; empty means long-term valid",
            order: 20,
            valueChange({ form }) {
              fillRecord(form);
            },
          },
          column: { width: 180, order: 900 },
        },
        hostRecord: {
          title: "TXT hostname",
          type: "copyable",
          form: {
            show: false,
          },
          column: {
            width: 220,
            cellRender({ value }) {
              return (
                <a-tooltip title={value}>
                  <fs-copyable modelValue={value}></fs-copyable>
                </a-tooltip>
              );
            },
          },
        },
        recordValue: {
          title: "Set TXT record",
          type: "copyable",
          form: {
            show: false,
          },
          column: {
            width: 380,
            cellRender({ value }) {
              return (
                <a-tooltip title={value}>
                  <fs-copyable modelValue={value}></fs-copyable>
                </a-tooltip>
              );
            },
          },
        },
        dnsProviderType: {
          title: "DNS provider",
          type: "dict-select",
          dict: dnsProviderTypeDict,
          form: {
            show: false,
            component: {
              name: "DnsProviderSelector",
            },
          },
          column: { show: false },
        },
        dnsProviderAccess: {
          title: "DNS authorization",
          type: "dict-select",
          dict: accessDict,
          form: {
            show: false,
            component: {
              name: "AccessSelector",
              vModel: "modelValue",
              type: compute(({ form }) => {
                const type = form.dnsProviderType || "aliyun";
                return dnsProviderTypeDict?.dataMap[type]?.accessType || type;
              }),
            },
          },
          column: { show: false },
        },
        status: {
          title: "Status",
          type: "dict-select",
          dict: statusDict,
          form: {
            show: false,
            value: "pending",
          },
          column: {
            width: 120,
            cellRender({ value, row }) {
              async function resetStatus() {
                Modal.confirm({
                  title: "Revalidate",
                  content: "Reset this record status to pending setup and revalidate?",
                  onOk: async () => {
                    await api.UpdateObj({ id: row.id, status: "pending" });
                    await verifyRecord(row);
                  },
                });
              }
              return (
                <div class={"flex flex-left"}>
                  <fs-values-format modelValue={value} dict={statusDict}></fs-values-format>
                  {row.status === "valid" && (
                    <a-tooltip title="Revoke and revalidate">
                      <fs-icon class={"ml-5 pointer color-yellow"} icon="solar:undo-left-square-bold" onClick={resetStatus}></fs-icon>
                    </a-tooltip>
                  )}
                </div>
              );
            },
          },
        },
        triggerValidate: {
          title: "Validate",
          type: "text",
          form: {
            show: false,
          },
          column: {
            conditionalRenderDisabled: true,
            width: 210,
            align: "center",
            cellRender({ row }) {
              return (
                <a-space>
                  {row.status === "valid" ? (
                    <span class="text-gray-500">Do not delete the TXT record</span>
                  ) : (
                    <>
                      <a-button type="primary" size="small" onClick={() => showRecordHelp(row)}>Set TXT</a-button>
                      <a-button type="primary" size="small" onClick={() => verifyRecord(row)}>Validate</a-button>
                    </>
                  )}
                </a-space>
              );
            },
          },
        },
        accountUri: {
          title: "Account URI",
          type: "text",
          form: { show: false },
          column: { show: false },
        },
      },
    },
  };
}
