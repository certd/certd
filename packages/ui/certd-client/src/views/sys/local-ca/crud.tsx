import { AddReq, compute, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { notification, Tag } from "ant-design-vue";
import dayjs from "dayjs";
import { localCaApi } from "./api";
import { useLocalCaDialogs } from "./use";
import { useI18n } from "/src/locales";
import { useCrudPermission } from "/@/plugin/permission";
import { getSecretAccessToken } from "/@/views/certd/access/api";
import LocalCaAccess from "./ca-access.vue";

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { t } = useI18n();
  const { hasActionPermission } = useCrudPermission(context);
  const {
    openGenerate,
    openIntermediate,
    openCreateEab,
    openImport,
    openView,
    openExport,
    openIssuedCerts,
    openAcmeAccounts,
    openRevokeIntermediate,
    openRotateIntermediate,
    openEnableCa,
    openArchiveCa,
    openArchivedRoots,
    openStepUp,
  } = useLocalCaDialogs(crudExpose, context.caViewRef);
  if (context.caExportHandler) {
    context.caExportHandler.value = openExport;
  }
  if (context.caAcmeEnableHandler) {
    context.caAcmeEnableHandler.value = async (row: any) => {
      return await openStepUp(t("certd.localCa.acmeStepUpTitle"), t("certd.localCa.acmeStepUpDesc"), async () => {
        await localCaApi.EnableAcme(row.id, true, getSecretAccessToken());
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
            icon: "ph:upload-simple",
            show: hasActionPermission("write"),
            click: async () => {
              await openImport();
            },
          },
          eab: {
            text: t("certd.localCa.eabCreate"),
            icon: "ph:key",
            show: hasActionPermission("write"),
            click: async () => {
              await openCreateEab();
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
        width: 360,
        buttons: {
          copy: { show: false },
          intermediate: {
            order: 0,
            type: "link",
            text: null,
            tooltip: { title: t("certd.localCa.intermediate") },
            icon: "ph:git-branch",
            show: compute(({ row }) => hasActionPermission("write") && row.caType === "root"),
            click: async ({ row }) => {
              await openIntermediate(row);
            },
          },
          rotate: {
            order: 1,
            type: "link",
            text: null,
            tooltip: { title: t("certd.localCa.rotateIntermediate") },
            icon: "ph:arrows-clockwise",
            show: compute(({ row }) => hasActionPermission("write") && row.caType === "intermediate" && !row.disabled && !row.revoked),
            click: async ({ row }) => {
              openRotateIntermediate(row);
            },
          },
          revokeIntermediate: {
            order: 2,
            type: "link",
            text: null,
            tooltip: { title: t("certd.localCa.revokeIntermediate") },
            icon: "ph:prohibit",
            show: compute(({ row }) => hasActionPermission("write") && row.caType === "intermediate" && !row.disabled && !row.revoked),
            click: async ({ row }) => {
              openRevokeIntermediate(row);
            },
          },
          view: {
            order: 3,
            type: "link",
            text: null,
            tooltip: { title: t("certd.localCa.view") },
            icon: "ph:certificate",
            click: async ({ row }) => {
              await openView(row);
            },
          },
          certs: {
            order: 4,
            type: "link",
            text: null,
            tooltip: { title: t("certd.localCa.issuedCerts") },
            icon: "ph:file-text",
            click: async ({ row }) => {
              await openIssuedCerts(row);
            },
          },
          acmeAccounts: {
            order: 5,
            type: "link",
            text: null,
            tooltip: { title: t("certd.localCa.acmeAccounts") },
            icon: "ph:users-three",
            show: compute(({ row }) => row.caType === "intermediate" && row.acmeEnabled),
            click: async ({ row }) => {
              await openAcmeAccounts(row);
            },
          },
          edit: {
            order: 10,
            show: hasActionPermission("write"),
          },
          archive: {
            order: 20,
            type: "link",
            text: null,
            tooltip: { title: t("certd.localCa.archiveCaTitle") },
            icon: "ph:archive-box",
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
            width: 200,
            ellipsis: true,
            cellRender({ value, row }) {
              const rotated = !!row.rotatedToId;
              const inactive = rotated || row.disabled || row.revoked;
              return (
                <span style={{ paddingLeft: row.level ? "18px" : "0", color: inactive ? "#999" : undefined, textDecoration: inactive ? "line-through" : undefined }}>
                  {row.level ? "↳ " : ""}
                  {value}
                  {rotated ? <Tag style={{ marginLeft: 6, textDecoration: "none" }}>{t("certd.localCa.rotatedTag")}</Tag> : row.disabled ? <Tag style={{ marginLeft: 6, textDecoration: "none" }}>{t("common.disabled")}</Tag> : null}
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
          column: { width: 180, ellipsis: true },
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
            component: { placeholder: "10.0.0.53:5353, 10.0.0.54" },
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
          column: { width: 180, ellipsis: true },
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
            component: {
              name: "fs-dict-switch",
              vModel: "checked",
              disabled: compute(({ row }) => !!row.rotatedToId || !!row.revoked),
              on: {
                async change({ row, $event }) {
                  if ($event === false) {
                    await openEnableCa(row);
                    return;
                  }
                  await localCaApi.Disable(row.id, true);
                  notification.success({ message: t("certd.localCa.disabledSuccess") });
                  await crudExpose.doRefresh();
                },
              },
            },
          },
        },
        acmeEnabled: {
          title: t("certd.localCa.fields.acmeEnabled"),
          type: "dict-switch",
          dict: dict({
            data: [
              { label: t("common.enabled"), value: true, color: "green" },
              { label: t("common.disabled"), value: false, color: "default" },
            ],
          }),
          form: { show: false },
          search: { show: false },
          column: {
            width: 100,
            align: "center",
            show: compute(({ row }) => row.caType === "intermediate"),
            component: {
              name: "fs-dict-switch",
              vModel: "checked",
              disabled: compute(({ row }) => row.caType !== "intermediate" || !!row.rotatedToId || !!row.revoked),
              on: {
                async change({ row, $event }) {
                  if (row.caType !== "intermediate") {
                    await crudExpose.doRefresh();
                    return;
                  }
                  if ($event === true) {
                    const verified = await openStepUp(t("certd.localCa.acmeStepUpTitle"), t("certd.localCa.acmeStepUpDesc"), async () => {
                      await localCaApi.EnableAcme(row.id, true, getSecretAccessToken());
                    });
                    if (!verified) {
                      await crudExpose.doRefresh();
                      return;
                    }
                  } else {
                    await localCaApi.EnableAcme(row.id, false);
                  }
                  notification.success({ message: t("certd.localCa.acmeChanged") });
                  await crudExpose.doRefresh();
                },
              },
            },
          },
        },
        acmeDirectIssue: {
          title: t("certd.localCa.fields.acmeDirectIssue"),
          type: "dict-switch",
          dict: dict({
            data: [
              { label: t("certd.localCa.acmeDirectIssueYes"), value: true, color: "green" },
              { label: t("certd.localCa.acmeDirectIssueNo"), value: false, color: "default" },
            ],
          }),
          form: {
            show: compute(({ form }) => form.caType === "intermediate" && form.acmeEnabled),
            col: { span: 24 },
            helper: t("certd.localCa.fields.acmeDirectIssueHelper"),
          },
          search: { show: false },
          column: { show: false },
        },
        permissions: {
          title: t("certd.localCa.permissions"),
          form: {
            show: compute(({ form }) => !!form.id),
            col: { span: 24 },
            component: {
              name: LocalCaAccess,
              caId: compute(({ form }) => form.id),
              caType: compute(({ form }) => form.caType),
              runStepUp: (title: string, desc: string, action: () => Promise<void>) => openStepUp(title, desc, action),
            },
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
