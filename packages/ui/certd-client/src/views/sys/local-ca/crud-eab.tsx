import { compute, CreateCrudOptionsProps, CreateCrudOptionsRet, dict, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { notification } from "ant-design-vue";
import dayjs from "dayjs";
import { useI18n } from "/src/locales";
import { request } from "/@/api/service";
import { getSecretAccessToken } from "/@/views/certd/access/api";
import { localCaApi } from "./api";

function formatTime(value?: number) {
  if (!value) {
    return "-";
  }
  return dayjs(Number(value)).format("YYYY-MM-DD HH:mm:ss");
}

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { t } = useI18n();
  const caIdRef = context.caIdRef;
  let grants: any[] = [];
  let users: any[] = [];
  let projects: any[] = [];

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
  function grantLabel(record: any) {
    if (record.grantId) {
      const grant = grants.find(item => Number(item.id) === Number(record.grantId));
      if (grant) {
        return `#${grant.id}`;
      }
      return `#${record.grantId}`;
    }
    return t("certd.localCa.systemLevelTag");
  }
  function userLabel(id: number) {
    const user = users.find(item => Number(item.id) === Number(id));
    if (user) {
      return user.nickName || user.username || `#${id}`;
    }
    return `#${id}`;
  }
  function projectLabel(id: number) {
    const project = projects.find(item => Number(item.id) === Number(id));
    if (project) {
      return project.name;
    }
    return `#${id}`;
  }
  function ownerLabel(record: any) {
    if (!record.userId || Number(record.userId) <= 0) {
      return t("certd.localCa.systemLevelTag");
    }
    if (record.projectId) {
      return `${userLabel(record.userId)} / ${projectLabel(record.projectId)}`;
    }
    return userLabel(record.userId);
  }

  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    const caId = caIdRef.value;
    if (!caId) {
      return { records: [], total: 0 };
    }
    const [eabs, grantList] = await Promise.all([localCaApi.ListEab(caId), localCaApi.ListGrants(caId).catch(() => [])]);
    grants = grantList || [];
    try {
      users = (await request({ url: "/sys/authority/user/getSimpleUsers", method: "POST" })) || [];
    } catch {
      users = [];
    }
    try {
      const res: any = await request({ url: "/sys/enterprise/project/page", method: "post", data: { page: { current: 1, size: 1000 } } });
      projects = res?.records || [];
    } catch {
      projects = [];
    }
    const records = eabs || [];
    return { records, total: records.length };
  };

  async function toggleDisabled(row: any, disabled: boolean) {
    const action = async () => {
      await localCaApi.SetEabStatus(caIdRef.value, row.id, disabled, getSecretAccessToken());
      notification.success({ message: t("certd.localCa.eabStatusChanged") });
      await crudExpose.doRefresh();
    };
    // 停用EAB影响客户注册，需要二次验证；重新启用直接执行
    if (disabled) {
      await context.runStepUp(action);
    } else {
      await action();
    }
  }

  async function togglePrivileged(row: any) {
    await context.runStepUp(async () => {
      await localCaApi.SetEabPrivileged(caIdRef.value, row.id, !row.privileged, getSecretAccessToken());
      notification.success({ message: t("certd.localCa.eabPrivilegedChanged") });
      await crudExpose.doRefresh();
    });
  }

  return {
    crudOptions: {
      request: { pageRequest },
      search: { show: false },
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
        width: 120,
        buttons: {
          view: { show: false },
          edit: { show: false },
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
        },
      },
      columns: {
        name: { title: t("certd.localCa.eabName"), type: "text", column: { width: 150, ellipsis: true } },
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
        grantId: {
          title: t("certd.localCa.eabGrant"),
          type: "text",
          column: { width: 120, cellRender: ({ row }) => grantLabel(row) },
        },
        userId: {
          title: t("certd.localCa.eabOwner"),
          type: "text",
          column: { width: 160, cellRender: ({ row }) => ownerLabel(row) },
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
            component: {
              name: "fs-dict-switch",
              vModel: "checked",
              on: {
                async change({ row, $event }) {
                  await toggleDisabled(row, $event === true);
                },
              },
            },
          },
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
