import { AddReq, compute, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { notification } from "ant-design-vue";
import dayjs from "dayjs";
import { localCaApi } from "./api";
import { useLocalCaDialogs } from "./use";
import { useI18n } from "/src/locales";
import { useCrudPermission } from "/@/plugin/permission";
import { useProjectStore } from "/@/store/project";
import { useUserStore } from "/@/store/user";
import { env } from "/@/utils/util.env";

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { t } = useI18n();
  const projectStore = useProjectStore();
  const userStore = useUserStore();
  const { hasActionPermission } = useCrudPermission(context);
  const { openGenerate, openIntermediate, openImport, openView, openViewSettings, openExport, openIssuedCerts } = useLocalCaDialogs(crudExpose);

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
      { label: "RSA 4096", value: "rsa4096", color: "purple" },
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
    const res = await localCaApi.GetList(query);
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
    return await localCaApi.UpdateObj(form);
  };
  const delRequest = async ({ row }: DelReq) => {
    return await localCaApi.DelObj(row.id);
  };
  const addRequest = async ({ form }: AddReq) => {
    return form;
  };

  function download(row: any) {
    let url = `${env.API}/cert/local-ca/download?id=${row.id}`;
    if (projectStore.isEnterprise) {
      url += `&projectId=${projectStore.currentProject?.id}`;
    }
    url += `&token=${userStore.getToken}`;
    window.open(url);
  }

  return {
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest,
      },
      table: {
        rowKey: "id",
      },
      search: {
        initialForm: {
          ...projectStore.getSearchForm(),
        },
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
        },
      },
      rowHandle: {
        width: 420,
        buttons: {
          intermediate: {
            order: 0,
            type: "link",
            text: t("certd.localCa.intermediate"),
            icon: "ph:git-branch",
            show: ({ row }) => hasActionPermission("write") && row.caType === "root",
            click: async ({ row }) => {
              await openIntermediate(row);
            },
          },
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
          info: {
            order: 2,
            type: "link",
            text: null,
            tooltip: { title: t("certd.localCa.viewSettingsTitle") },
            icon: "ph:info",
            click: ({ row }) => {
              openViewSettings(row);
            },
          },
          download: {
            order: 3,
            type: "link",
            text: null,
            tooltip: { title: t("certd.localCa.download") },
            icon: "ph:download-simple",
            click: ({ row }) => {
              download(row);
            },
          },
          crl: {
            order: 4,
            type: "link",
            text: null,
            tooltip: { title: t("certd.localCa.downloadCrl") },
            icon: "ph:list-magnifying-glass",
            click: ({ row }) => {
              window.open(`${env.API}/cert/local-ca/crl?id=${row.id}&format=pem`);
            },
          },
          export: {
            order: 5,
            type: "link",
            text: null,
            tooltip: { title: t("certd.localCa.export") },
            icon: "ph:export",
            show: hasActionPermission("write"),
            click: async ({ row }) => {
              await openExport(row);
            },
          },
          certs: {
            order: 6,
            type: "link",
            text: null,
            tooltip: { title: t("certd.localCa.issuedCerts") },
            icon: "ph:file-text",
            click: async ({ row }) => {
              await openIssuedCerts(row);
            },
          },
          edit: {
            order: 10,
            show: hasActionPermission("write"),
          },
          remove: {
            order: 20,
            show: hasActionPermission("write"),
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
          column: { width: 180, ellipsis: true },
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
          search: { show: false },
          column: { width: 110, component: { color: "auto" } },
        },
        parentName: {
          title: t("certd.localCa.fields.parentCa"),
          type: "text",
          form: { show: false },
          search: { show: false },
          column: { width: 140, ellipsis: true },
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
          column: { width: 110 },
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
                  <fs-copyable modelValue={value} button={{ show: true }}>
                    <span class="pointer">{value.slice(0, 24)}...</span>
                  </fs-copyable>
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
              on: {
                async change({ row, $event }) {
                  await localCaApi.Disable(row.id, $event);
                  notification.success({ message: $event ? t("certd.localCa.disabledSuccess") : t("certd.localCa.enabledSuccess") });
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
              on: {
                async change({ row, $event }) {
                  await localCaApi.EnableAcme(row.id, $event);
                  notification.success({ message: t("certd.localCa.acmeChanged") });
                  await crudExpose.doRefresh();
                },
              },
            },
          },
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
