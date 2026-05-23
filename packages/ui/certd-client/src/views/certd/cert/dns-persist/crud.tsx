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
      { value: "pending", label: "待设置", color: "warning" },
      { value: "created", label: "已创建", color: "blue" },
      { value: "validating", label: "校验中", color: "blue" },
      { value: "valid", label: "有效", color: "green" },
      { value: "failed", label: "请重试", color: "red" },
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
        message: "请到供应商删除TXT记录",
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
      message.error("ACME账号授权缺少accountUri，请重新生成账号");
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
    message[ok ? "success" : "error"](ok ? "校验成功" : "未找到匹配的TXT记录，请稍后重试");
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
          title: "域名",
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
          title: "主域名",
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
          title: "通配符",
          type: "dict-switch",
          form: {
            show: false,
            value: true,
          },
          column: { show: false },
        },
        acmeAccountAccessId: {
          title: "ACME账号授权",
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
            width: 180,
          },
        },
        caType: {
          title: "颁发机构",
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
          title: "有效期至",
          type: "datetime",
          form: {
            helper: "可选；为空表示长期有效",
            order: 20,
            valueChange({ form }) {
              fillRecord(form);
            },
          },
          column: { width: 180, order: 900 },
        },
        hostRecord: {
          title: "TXT主机名",
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
          title: "请设置TXT记录",
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
          title: "DNS服务商",
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
          title: "DNS授权",
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
          title: "状态",
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
                  title: "重新校验",
                  content: "确认将该记录状态重置为待设置，并重新校验吗？",
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
                    <a-tooltip title="撤销并重新校验">
                      <fs-icon class={"ml-5 pointer color-yellow"} icon="solar:undo-left-square-bold" onClick={resetStatus}></fs-icon>
                    </a-tooltip>
                  )}
                </div>
              );
            },
          },
        },
        triggerValidate: {
          title: "校验",
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
                    <span class="text-gray-500">请勿删除TXT记录</span>
                  ) : (
                    <>
                      <a-button type="primary" size="small" onClick={() => showRecordHelp(row)}>
                        设置TXT
                      </a-button>
                      <a-button type="primary" size="small" onClick={() => verifyRecord(row)}>
                        校验
                      </a-button>
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
