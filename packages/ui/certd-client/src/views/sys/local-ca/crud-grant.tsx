import { CreateCrudOptionsProps, CreateCrudOptionsRet, dict, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import dayjs from "dayjs";
import { useI18n } from "/src/locales";
import { localCaApi } from "./api";

function formatTime(value?: number) {
  if (!value) {
    return "-";
  }
  return dayjs(Number(value) || value).format("YYYY-MM-DD HH:mm:ss");
}

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { t } = useI18n();

  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    const caId = context.caIdRef.value;
    if (!caId) {
      return { records: [], total: 0, currentPage: 1, pageSize: 20 };
    }
    // 先加载用户/项目名称，保证列表渲染时能解析授权对象
    await context.ensureOptions();
    const grants = (await localCaApi.ListGrants(caId)) || [];
    const records = grants.map((item: any) => {
      const userMode = Number(item.userId) > 0;
      return {
        ...item,
        mode: userMode ? "user" : "project",
        target: userMode ? context.userLabel(Number(item.userId)) : context.projectLabel(Number(item.projectId)),
        disabled: item.disabled === true || Number(item.disabled) === 1,
      };
    });
    return { records, total: records.length, currentPage: query.page?.currentPage || 1, pageSize: query.page?.pageSize || 20 };
  };

  return {
    crudOptions: {
      // 不启用行选择（避免表格前方出现无用的勾选框）
      settings: { plugins: { rowSelection: { enabled: false } } },
      request: { pageRequest },
      toolbar: { show: false },
      // 无查询字段，隐藏查询/重置行
      search: { show: false },
      pagination: { show: false },
      table: { rowKey: "id" },
      actionbar: {
        buttons: {
          add: { show: false },
          create: {
            text: t("certd.localCa.grantAddTitle"),
            type: "primary",
            icon: "ph:plus-circle",
            click: async () => {
              await context.openAddGrant(() => crudExpose.doRefresh());
            },
          },
        },
      },
      rowHandle: {
        title: t("certd.localCa.accessActions"),
        width: 120,
        buttons: {
          view: { show: false },
          copy: { show: false },
          edit: { show: false },
          remove: {
            type: "link",
            text: t("certd.localCa.removeAccess"),
            danger: true,
            click: async ({ row }) => {
              await context.openRemoveGrant(row, () => crudExpose.doRefresh());
            },
          },
        },
      },
      columns: {
        mode: {
          title: t("certd.localCa.grantMode"),
          type: "dict-select",
          dict: dict({
            data: [
              { label: t("certd.localCa.grantModeUser"), value: "user", color: "blue" },
              { label: t("certd.localCa.grantModeProject"), value: "project", color: "green" },
            ],
          }),
          column: { width: 110, align: "center", component: { color: "auto" } },
        },
        target: {
          title: t("certd.localCa.grantTarget"),
          type: "text",
          column: { ellipsis: true },
        },
        disabled: {
          title: t("certd.localCa.fields.disabled"),
          type: "dict-select",
          dict: dict({
            data: [
              { label: t("common.enabled"), value: false, color: "green" },
              { label: t("common.disabled"), value: true, color: "red" },
            ],
          }),
          column: { width: 90, align: "center", component: { color: "auto" } },
        },
        createTime: {
          title: t("certd.common.createTime"),
          type: "datetime",
          column: { width: 170, cellRender: ({ value }) => formatTime(value) },
        },
      },
    },
  };
}
