import { compute, CreateCrudOptionsProps, CreateCrudOptionsRet, dict, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { h } from "vue";
import { Button, notification } from "ant-design-vue";
import dayjs from "dayjs";
import { useI18n } from "/src/locales";
import { getSecretAccessToken } from "/@/views/certd/access/api";
import { localCaApi } from "./api";

function formatTime(value?: number) {
  if (!value) {
    return "-";
  }
  return dayjs(Number(value) || value).format("YYYY-MM-DD HH:mm:ss");
}

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { t } = useI18n();
  const caIdRef = context.caIdRef;

  function formatDomains(value: any) {
    if (!value) {
      return t("certd.localCa.eabInheritCa");
    }
    try {
      const arr = typeof value === "string" ? JSON.parse(value) : value;
      if (Array.isArray(arr) && arr.length) {
        return arr.join(", ");
      }
      return t("certd.localCa.eabInheritCa");
    } catch {
      return String(value);
    }
  }

  let latestRequest: Promise<UserPageRes> | null = null;
  const fetchPage = async (query: UserPageQuery): Promise<UserPageRes> => {
    const caId = caIdRef.value;
    if (!caId) {
      return { records: [], total: 0, currentPage: 1, pageSize: 20 };
    }
    // 服务端按轮换链聚合：旧CA的EAB归最新CA统一管理
    const eabs = await localCaApi.ListEab(caId);
    let records = eabs || [];
    const nameKey = String(query.query?.name || "")
      .trim()
      .toLowerCase();
    if (nameKey) {
      records = records.filter(
        (item: any) =>
          String(item.name || "")
            .toLowerCase()
            .includes(nameKey) ||
          String(item.kid || "")
            .toLowerCase()
            .includes(nameKey)
      );
    }
    return { records, total: records.length, currentPage: query.page?.currentPage || 1, pageSize: query.page?.pageSize || 20 };
  };

  // 快速切换CA时旧响应不得覆盖新数据：过期请求等待最新请求结果
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    const task = fetchPage(query);
    latestRequest = task;
    const res = await task;
    if (latestRequest !== task) {
      return await latestRequest;
    }
    return res;
  };

  async function toggleDisabled(row: any, disabled: boolean) {
    const action = async () => {
      try {
        await localCaApi.SetEabStatus(row.caId, row.id, disabled, getSecretAccessToken());
        notification.success({ message: t("certd.localCa.eabStatusChanged") });
      } catch (e: any) {
        notification.error({ message: String(e?.message || e) });
      } finally {
        await crudExpose.doRefresh();
      }
    };
    // 启停均影响签发能力，服务端强制二次验证
    await context.runStepUp(action);
  }

  async function togglePrivileged(row: any) {
    await context.runStepUp(async () => {
      try {
        await localCaApi.SetEabPrivileged(row.caId, row.id, !row.privileged, getSecretAccessToken());
        notification.success({ message: t("certd.localCa.eabPrivilegedChanged") });
      } catch (e: any) {
        notification.error({ message: String(e?.message || e) });
      } finally {
        await crudExpose.doRefresh();
      }
    });
  }

  return {
    crudOptions: {
      request: { pageRequest },
      toolbar: { show: false },
      pagination: { show: false },
      table: { rowKey: "id" },
      actionbar: {
        buttons: {
          add: { show: false },
          create: {
            text: t("certd.localCa.eabCreateTitle"),
            type: "primary",
            icon: "ph:plus-circle",
            click: async () => {
              await context.openCreateEab(() => crudExpose.doRefresh(), caIdRef.value);
            },
          },
        },
      },
      rowHandle: {
        width: 300,
        buttons: {
          view: { show: false },
          edit: {
            type: "link",
            text: t("common.edit"),
            click: async ({ row }) => {
              await context.openEditEab(row, () => crudExpose.doRefresh());
            },
          },
          assignAccount: {
            type: "link",
            text: t("certd.localCa.eabAssignAccount"),
            show: compute(({ row }) => !row.revoked),
            click: async ({ row }) => {
              await context.openAssignAccount(row, () => crudExpose.doRefresh());
            },
          },
          remove: { show: false },
          copy: { show: false },
          upgrade: {
            type: "link",
            text: t("certd.localCa.eabUpgrade"),
            show: compute(({ row }) => !row.privileged),
            click: async ({ row }) => {
              await togglePrivileged(row);
            },
          },
          downgrade: {
            type: "link",
            text: t("certd.localCa.eabDowngrade"),
            show: compute(({ row }) => row.privileged === true),
            click: async ({ row }) => {
              await togglePrivileged(row);
            },
          },
          leakRevoke: {
            type: "link",
            text: t("certd.localCa.leakRevokeTitle"),
            show: compute(({ row }) => !(row.accountCount > 0 && row.riskAccountCount >= row.accountCount)),
            click: async ({ row }) => {
              await context.openLeakRevoke(row, () => crudExpose.doRefresh());
            },
          },
        },
      },
      columns: {
        name: { title: t("certd.localCa.eabName"), type: "text", search: { show: true, col: { span: 6 } }, column: { width: 150, ellipsis: true } },
        kid: {
          title: "KID",
          type: "text",
          column: {
            width: 200,
            cellRender({ value }) {
              return <fs-copyable modelValue={value} />;
            },
          },
        },
        privileged: {
          title: t("certd.localCa.eabType"),
          type: "dict-select",
          dict: dict({
            data: [
              { label: t("certd.localCa.eabTypeNormal"), value: false, color: "default" },
              { label: t("certd.localCa.eabTypePrivileged"), value: true, color: "orange" },
            ],
          }),
          column: { width: 90, align: "center", component: { color: "auto" } },
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
          column: {
            width: 100,
            align: "center",
            cellRender({ row }) {
              if (row.revoked) {
                return <a-tag color="red">{t("certd.localCa.eabLeaked")}</a-tag>;
              }
              return (
                <a-switch
                  size="small"
                  checked={!row.disabled}
                  checkedChildren={t("common.enabled")}
                  unCheckedChildren={t("common.disabled")}
                  onChange={async (checked: any) => {
                    // checked=true 表示启用 → disabled=false
                    await toggleDisabled(row, checked !== true);
                  }}
                />
              );
            },
          },
        },
        accountCount: {
          title: t("certd.localCa.eabAccountCount"),
          type: "number",
          column: { width: 90, align: "center", cellRender: ({ value }) => value || 0 },
        },
        allowedDomains: {
          title: t("certd.localCa.eabAllowedDomains"),
          type: "text",
          column: { width: 180, ellipsis: true, cellRender: ({ value }) => formatDomains(value) },
        },
        usedCount: {
          title: t("certd.localCa.eabUses"),
          type: "number",
          column: { width: 100, align: "center", cellRender: ({ row }) => `${row.usedCount || 0} / ${row.maxUses || "∞"}` },
        },
        expiresTime: {
          title: t("certd.localCa.eabExpires"),
          type: "datetime",
          column: { width: 170, cellRender: ({ value }) => formatTime(value) },
        },
        remark: { title: t("certd.localCa.fields.remark"), type: "text", column: { width: 150, ellipsis: true } },
        createTime: {
          title: t("certd.common.createTime"),
          type: "datetime",
          column: { width: 170, cellRender: ({ value }) => formatTime(value) },
        },
      },
    },
  };
}
