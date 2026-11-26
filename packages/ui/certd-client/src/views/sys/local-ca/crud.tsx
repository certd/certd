import { AddReq, compute, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { Modal, notification, Tag } from "ant-design-vue";
import dayjs from "dayjs";
import { localCaApi } from "./api";
import { useLocalCaDialogs } from "./use";
import { useI18n } from "/src/locales";
import { useCrudPermission } from "/@/plugin/permission";
import { getSecretAccessToken } from "/@/views/certd/access/api";

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { t } = useI18n();
  const { hasActionPermission } = useCrudPermission(context);
  const { openGenerate, openIntermediate, openImport, openView, openExport, openRevokeIntermediate, openRotateIntermediate, openEnableCa, openArchiveCa, openArchivedRoots, openStepUp } = useLocalCaDialogs(
    crudExpose,
    context.caViewRef
  );
  if (context.caExportHandler) {
    context.caExportHandler.value = openExport;
  }
  if (context.caAcmeEnableHandler) {
    context.caAcmeEnableHandler.value = async (row: any) => {
      return await openStepUp(t("certd.localCa.acmeStepUpTitle"), t("certd.localCa.acmeStepUpDesc"), async () => {
        await localCaApi.EnableAcme(row.id, true, getSecretAccessToken(), "local");
      });
    };
  }

  const sourceDict = dict({
    data: [
      { label: t("certd.localCa.source.generated"), value: "generated", color: "green" },
      { label: t("certd.localCa.source.imported"), value: "imported", color: "blue" },
    ],
  });
  const caTypeDict = dict({
    data: [
      { label: t("certd.localCa.caTypeRoot"), value: "root", color: "purple" },
      { label: t("certd.localCa.caTypeIntermediate"), value: "intermediate", color: "blue" },
    ],
  });
  const keyTypeDict = dict({
    data: [
      { label: "RSA 2048", value: "rsa2048", color: "blue" },
      { label: "RSA 3072", value: "rsa3072", color: "geekblue" },
      { label: "RSA 4096", value: "rsa4096", color: "purple" },
      { label: "ECDSA P-256", value: "ecdsa256", color: "green" },
      { label: "ECDSA P-384", value: "ecdsa384", color: "cyan" },
    ],
  });
  const usageDict = dict({
    data: [
      { label: t("certd.localCa.usage.server"), value: "server" },
      { label: t("certd.localCa.usage.client"), value: "client" },
      { label: t("certd.localCa.usage.both"), value: "both" },
    ],
  });

  const acmeStateOptions = [
    { label: t("certd.localCa.acmeStateOff"), value: "off" },
    { label: t("certd.localCa.acmeStateLocal"), value: "local" },
    { label: t("certd.localCa.acmeStateStandard"), value: "standard" },
  ];

  let acmeStateInFlight = false;
  async function changeAcmeState(row: any, value: string) {
    if (acmeStateInFlight) {
      return;
    }
    acmeStateInFlight = true;
    try {
      await doChangeAcmeState(row, value);
    } finally {
      acmeStateInFlight = false;
    }
  }

  async function doChangeAcmeState(row: any, value: string) {
    if (row.caType !== "intermediate") {
      await crudExpose.doRefresh();
      return;
    }
    if (value === "off") {
      try {
        await localCaApi.EnableAcme(row.id, false);
        notification.success({ message: t("certd.localCa.acmeChanged") });
      } catch (e: any) {
        notification.error({ message: String(e?.message || e) });
      }
      await crudExpose.doRefresh();
      return;
    }
    // 开放标准ACME意味着外部客户端可访问，先做风险提示并建议白名单限制
    if (value === "standard") {
      const confirmed = await new Promise<boolean>(resolve => {
        Modal.confirm({
          title: t("certd.localCa.acmeStandardRiskTitle"),
          content: t("certd.localCa.acmeStandardRiskContent"),
          okText: t("certd.localCa.acmeStandardRiskOk"),
          okType: "danger",
          cancelText: t("certd.common.cancel"),
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });
      if (!confirmed) {
        await crudExpose.doRefresh();
        return;
      }
    }
    const verified = await openStepUp(t("certd.localCa.acmeStepUpTitle"), t("certd.localCa.acmeStepUpDesc"), async () => {
      await localCaApi.EnableAcme(row.id, true, getSecretAccessToken(), value as "local" | "standard");
    });
    if (!verified) {
      await crudExpose.doRefresh();
      return;
    }
    notification.success({ message: t("certd.localCa.acmeChanged") });
    await crudExpose.doRefresh();
  }

  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    let res: any;
    try {
      res = await localCaApi.GetList(query);
    } catch (e: any) {
      notification.error({ message: String(e?.message || e) });
      throw e;
    }
    for (const row of res.records || []) {
      let list: string[] = [];
      try {
        const parsed = row.allowedDomains ? JSON.parse(row.allowedDomains) : [];
        list = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        list = [];
      }
      row.allowedDomainsText = list.join("\n");
      // ACME三档：关闭/仅本地/标准（legacy数据缺省标准，兼容旧行为）
      if (!row.acmeEnabled) {
        row.acmeState = "off";
      } else if (row.acmeMode === "local") {
        row.acmeState = "local";
      } else {
        row.acmeState = "standard";
      }
    }
    return res;
  };
  const editRequest = async ({ form, row }: EditReq) => {
    form.id = row.id;
    form.allowedDomains = String(form.allowedDomainsText || "")
      .split(/[,，\s]+/)
      .map((item: string) => item.trim())
      .filter(Boolean);
    delete form.allowedDomainsText;
    try {
      const res = await localCaApi.UpdateObj(form);
      notification.success({ message: t("certd.localCa.updateSuccess") });
      return res;
    } catch (e: any) {
      const message = String(e?.message || "");
      if (!/2FA|Passkey|验证/.test(message)) {
        notification.error({ message });
        throw e;
      }
      const verified = await openStepUp(t("certd.localCa.updateStepUpTitle"), t("certd.localCa.updateStepUpDesc"), async () => {});
      if (!verified) {
        throw e;
      }
      try {
        const res = await localCaApi.UpdateObj(form);
        notification.success({ message: t("certd.localCa.updateSuccess") });
        return res;
      } catch (retryError: any) {
        notification.error({ message: String(retryError?.message || retryError) });
        throw retryError;
      }
    }
  };
  const delRequest = async ({ row }: DelReq) => {
    try {
      return await localCaApi.Archive(row.id);
    } catch (e: any) {
      notification.error({ message: String(e?.message || e) });
      throw e;
    }
  };
  const addRequest = async ({ form }: AddReq) => {
    return form;
  };

  return {
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest,
      },
      pagination: {
        pageSize: 1000,
        pageSizeOptions: ["50", "100", "200", "500", "1000"],
      },
      table: {
        rowKey: "id",
      },
      actionbar: {
        buttons: {
          add: {
            show: false,
          },
          generate: {
            text: t("certd.localCa.generate"),
            type: "primary",
            icon: "ph:plus-circle",
            show: hasActionPermission("write"),
            click: async () => {
              await openGenerate();
            },
          },
          import: {
            text: t("certd.localCa.import"),
            type: "primary",
            icon: "ph:file-arrow-down",
            show: hasActionPermission("write"),
            click: async () => {
              await openImport();
            },
          },
          archivedRoots: {
            text: t("certd.localCa.archivedRootsTitle"),
            type: "link",
            icon: "ph:archive-box",
            show: hasActionPermission("write"),
            click: async () => {
              await openArchivedRoots();
            },
          },
        },
      },
      rowHandle: {
        width: 200,
        fixed: "right",
        dropdown: {
          show: true,
        },
        buttons: {
          copy: { show: false },
          view: {
            order: 1,
            type: "link",
            text: null,
            tooltip: { title: t("certd.localCa.view") },
            icon: "ph:certificate",
            click: async ({ row }) => {
              await openView(row);
            },
          },
          edit: {
            order: 2,
            show: hasActionPermission("write"),
          },
          intermediate: {
            order: 10,
            type: "link",
            text: t("certd.localCa.intermediate"),
            icon: "ph:git-branch",
            dropdown: true,
            show: compute(({ row }) => hasActionPermission("write") && row.caType === "root"),
            click: async ({ row }) => {
              await openIntermediate(row);
            },
          },
          rotate: {
            order: 11,
            type: "link",
            text: t("certd.localCa.rotateIntermediate"),
            icon: "ph:arrows-clockwise",
            dropdown: true,
            show: compute(({ row }) => hasActionPermission("write") && row.caType === "intermediate" && !row.disabled && !row.revoked),
            click: async ({ row }) => {
              openRotateIntermediate(row);
            },
          },
          revokeIntermediate: {
            order: 12,
            type: "link",
            text: t("certd.localCa.revokeIntermediate"),
            icon: "ph:prohibit",
            dropdown: true,
            show: compute(({ row }) => hasActionPermission("write") && row.caType === "intermediate" && !row.disabled && !row.revoked),
            click: async ({ row }) => {
              openRevokeIntermediate(row);
            },
          },
          archive: {
            order: 13,
            type: "link",
            text: t("certd.localCa.archiveCaTitle"),
            icon: "ph:archive-box",
            dropdown: true,
            show: compute(({ row }) => hasActionPermission("write") && !row.deleted),
            click: async ({ row }) => {
              openArchiveCa(row);
            },
          },
          remove: {
            show: false,
          },
        },
      },
      form: {
        wrapper: {
          width: 640,
        },
        labelCol: {
          // @ts-ignore
          span: null,
          style: { width: "120px" },
        },
      },
      columns: {
        id: {
          title: "ID",
          type: "number",
          form: { show: false },
          search: { show: false },
          column: { width: 70, align: "center" },
        },
        name: {
          title: t("certd.localCa.fields.name"),
          type: "text",
          search: { show: true },
          form: {
            required: true,
            rules: [{ required: true, message: t("certd.common.required") }],
          },
          column: {
            width: 230,
            ellipsis: true,
            cellRender({ value, row }) {
              const rotated = !!row.rotatedToId;
              const inactive = rotated || row.disabled || row.revoked;
              return (
                <span style={{ paddingLeft: row.level ? "18px" : "0", color: inactive ? "#999" : undefined, textDecoration: inactive ? "line-through" : undefined }}>
                  {row.level ? "↳ " : ""}
                  {value}
                  {rotated ? (
                    <Tag style={{ marginLeft: 6, textDecoration: "none" }}>{t("certd.localCa.rotatedTag")}</Tag>
                  ) : row.disabled ? (
                    <Tag style={{ marginLeft: 6, textDecoration: "none" }}>{t("common.disabled")}</Tag>
                  ) : null}
                </span>
              );
            },
          },
        },
        subjectCn: {
          title: t("certd.localCa.fields.subjectCn"),
          type: "text",
          search: { show: true },
          form: { show: false },
          column: { width: 230, ellipsis: true },
        },
        source: {
          title: t("certd.localCa.fields.source"),
          type: "dict-select",
          dict: sourceDict,
          form: { show: false },
          search: { show: false },
          column: { width: 100, component: { color: "auto" } },
        },
        caType: {
          title: t("certd.localCa.fields.caType"),
          type: "dict-select",
          dict: caTypeDict,
          form: { show: false },
          search: { show: true },
          column: { width: 110, component: { color: "auto" } },
        },
        acmeState: {
          title: t("certd.localCa.fields.acmeEnabled"),
          type: "text",
          form: { show: false },
          search: { show: false },
          column: {
            width: 110,
            align: "center",
            // cellRender直绑change：fs-dict-select列组件的on.change在当前版本不触发
            cellRender({ row }) {
              const disabled = row.caType !== "intermediate" || !!row.rotatedToId || !!row.revoked;
              return <a-select size="small" value={row.acmeState} disabled={disabled} style={{ width: "96px" }} options={acmeStateOptions} onChange={(value: any) => changeAcmeState(row, value)} />;
            },
          },
        },
        disabled: {
          title: t("certd.localCa.fields.disabled"),
          type: "dict-switch",
          dict: dict({
            data: [
              { label: t("common.enabled"), value: false, color: "green" },
              { label: t("common.disabled"), value: true, color: "red" },
            ],
          }),
          form: { show: false },
          search: { show: false },
          column: {
            width: 100,
            align: "center",
            cellRender({ row }) {
              // 已轮换/已吊销的CA不再显示“已禁用”，避免与真实状态混淆
              if (row.rotatedToId) {
                return <Tag color="default">{t("certd.localCa.rotatedTag")}</Tag>;
              }
              if (row.revoked) {
                return <Tag color="red">{t("certd.localCa.statusRevoked")}</Tag>;
              }
              return (
                <a-switch
                  size="small"
                  checked={!row.disabled}
                  checkedChildren={t("common.enabled")}
                  unCheckedChildren={t("common.disabled")}
                  onChange={async (checked: any) => {
                    if (checked) {
                      // 开启需二次验证：走启用流程
                      await openEnableCa(row);
                      return;
                    }
                    try {
                      await localCaApi.Disable(row.id, true);
                      notification.success({ message: t("certd.localCa.disabledSuccess") });
                    } catch (e: any) {
                      notification.error({ message: String(e?.message || e) });
                    }
                    await crudExpose.doRefresh();
                  }}
                />
              );
            },
          },
        },
        status: {
          title: t("certd.localCa.fields.status"),
          type: "dict-select",
          dict: dict({
            data: [
              { label: t("certd.localCa.statusNormal"), value: "normal", color: "green" },
              { label: t("certd.localCa.statusRotated"), value: "rotated", color: "default" },
              { label: t("certd.localCa.statusDisabled"), value: "disabled", color: "red" },
            ],
          }),
          form: { show: false },
          search: { show: true },
          column: { show: false },
        },
        caPath: {
          title: t("certd.localCa.fields.caPath"),
          type: "text",
          form: { show: false },
          search: { show: false },
          column: { width: 220, ellipsis: true },
        },
        baseUrl: {
          title: t("certd.localCa.fields.baseUrl"),
          type: "text",
          form: {
            col: { span: 24 },
            component: {
              placeholder: window.location.origin,
              disabled: compute(({ form }) => form.caType === "intermediate"),
            },
            helper: t("certd.localCa.fields.baseUrlHelper", { origin: window.location.origin }),
          },
          search: { show: false },
          column: { width: 220, ellipsis: true },
        },
        dnsServer: {
          title: t("certd.localCa.fields.dnsServer"),
          type: "text",
          form: {
            col: { span: 24 },
            component: {
              placeholder: "10.0.0.53:5353, 10.0.0.54",
              disabled: compute(({ form }) => !!form.parentDnsServer),
            },
            helper: t("certd.localCa.fields.dnsServerHelper"),
          },
          search: { show: false },
          column: { show: false },
        },
        keyType: {
          title: t("certd.localCa.fields.keyType"),
          type: "dict-select",
          dict: keyTypeDict,
          form: { show: false },
          search: { show: false },
          column: { width: 110, component: { color: "auto" } },
        },
        usage: {
          title: t("certd.localCa.fields.usage"),
          type: "dict-select",
          dict: usageDict,
          form: { required: true, col: { span: 12 } },
          search: { show: false },
          column: { width: 100 },
        },
        maxValidityDays: {
          title: t("certd.localCa.fields.maxValidityDays"),
          type: "number",
          form: { col: { span: 12 }, component: { min: 0 } },
          search: { show: false },
          column: { width: 110, render: ({ value }: any) => (Number(value) > 0 ? value : t("certd.localCa.unlimited")) },
        },
        allowedDomainsText: {
          title: t("certd.localCa.fields.allowedDomains"),
          type: "textarea",
          form: {
            col: { span: 24 },
            component: { rows: 3, placeholder: "example.com\ninternal.example.com" },
            helper: t("certd.localCa.fields.allowedDomainsHelper"),
          },
          search: { show: false },
          column: {
            width: 180,
            ellipsis: true,
            cellRender({ value, row }) {
              // 域名列表较长，保持文字样式不变，仅以可点击手势触发展开查看CA对话框
              return (
                <span style={{ cursor: "pointer" }} onClick={() => openView(row)}>
                  {value || "-"}
                </span>
              );
            },
          },
        },
        notAfter: {
          title: t("certd.localCa.fields.notAfter"),
          type: "datetime",
          form: { show: false },
          search: { show: false },
          column: {
            width: 165,
            sorter: true,
            cellRender({ value }) {
              if (!value) {
                return "-";
              }
              const expired = dayjs(value).valueOf() < Date.now();
              return <span class={expired ? "color-red" : ""}>{dayjs(value).format("YYYY-MM-DD HH:mm:ss")}</span>;
            },
          },
        },
        fingerprintSha256: {
          title: t("certd.localCa.fields.fingerprint"),
          type: "text",
          form: { show: false },
          search: { show: false },
          column: {
            show: false,
            width: 220,
            cellRender({ value }) {
              if (!value) {
                return "-";
              }
              return (
                <a-tooltip title={value}>
                  <span>{value.slice(0, 24)}...</span>
                </a-tooltip>
              );
            },
          },
        },
        allowDirectSign: {
          title: t("certd.localCa.fields.allowDirectSign"),
          type: "dict-switch",
          dict: dict({
            data: [
              { label: t("certd.localCa.allowDirectSignYes"), value: true, color: "green" },
              { label: t("certd.localCa.allowDirectSignNo"), value: false, color: "default" },
            ],
          }),
          form: {
            show: compute(({ form }) => form.caType === "intermediate"),
            col: { span: 12 },
            value: false,
            helper: t("certd.localCa.fields.allowDirectSignHelper"),
          },
          search: { show: false },
          column: { show: false },
        },
        remark: {
          title: t("certd.localCa.fields.remark"),
          type: "textarea",
          form: { show: true, col: { span: 24 } },
          search: { show: false },
          column: { width: 180, ellipsis: true, show: false },
        },
        createTime: {
          title: t("certd.common.createTime"),
          type: "datetime",
          form: { show: false },
          search: { show: false },
          column: { width: 165, sorter: true, show: false },
        },
      },
    },
  };
}
