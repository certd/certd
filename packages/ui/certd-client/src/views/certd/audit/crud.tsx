import { ColumnProps, DataFormatterContext, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, UserPageQuery, UserPageRes, dict } from "@fast-crud/fast-crud";
import { useI18n } from "/src/locales";
import { useDicts } from "../dicts";

const typeDict = dict({
  url: "/pi/audit/dict",
  getData: async () => {
    const { createAuditApi } = await import("./api");
    const api = createAuditApi();
    const res = await api.GetDict();
    return res.types || [];
  },
});

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { t } = useI18n();
  const { myProjectDict } = useDicts();
  const api = context.api;

  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetList(query);
  };
  const delRequest = async (req: DelReq) => {
    return await api.DelObj(req.row.id);
  };

  return {
    crudOptions: {
      request: { pageRequest, delRequest },
      toolbar: {
        buttons: {
          export: { show: true },
        },
        export: {
          dataFrom: "search",
          columnFilter: (col: ColumnProps) => col.show === true,
          dataFormatter: (opts: DataFormatterContext) => {
            const { row, originalRow, col } = opts;
            const key = col.key;
            if (key === "createTime" && originalRow[key]) {
              row[key] = new Date(originalRow[key]).toLocaleString();
            }
          },
        },
      },
      actionbar: {
        buttons: {
          add: { show: false },
        },
      },
      rowHandle: {
        width: 120,
        fixed: "right",
        show: false,
        buttons: {
          view: { show: false },
          edit: { show: false },
          remove: { show: false },
          copy: { show: false },
        },
      },
      columns: {
        id: {
          title: "ID",
          type: "number",
          column: { width: 80 },
          form: { show: false },
        },
        createTime: {
          title: t("certd.audit.createTime"),
          type: "datetime",
          search: {
            show: true,
            component: {
              name: "a-range-picker",
            },
          },
          column: { width: 170, sorter: true },
          form: { show: false },
        },
        type: {
          title: t("certd.audit.type"),
          type: "dict-select",
          dict: typeDict,
          search: { show: true },
          column: { width: 120 },
          form: { show: false },
        },
        action: {
          title: t("certd.audit.action"),
          type: "text",
          search: { show: true },
          column: { width: 200, tooltip: true },
          form: { show: false },
        },
        success: {
          title: t("certd.audit.result"),
          type: "dict-switch",
          dict: dict({
            data: [
              { value: true, label: t("certd.audit.success"), color: "success" },
              { value: false, label: t("certd.audit.failed"), color: "error" },
            ],
          }),
          column: { width: 100, align: "center" },
          form: { show: false },
          search: { show: true },
        },
        content: {
          title: t("certd.audit.remark"),
          type: "text",
          search: { show: true },
          column: { width: 700, tooltip: true },
          form: { show: false },
        },
        ipAddress: {
          title: t("certd.audit.ipAddress"),
          type: "text",
          column: { width: 140 },
          form: { show: false },
        },
        projectId: {
          title: t("certd.common.fields.projectName"),
          type: "dict-select",
          dict: myProjectDict,
          form: {
            show: false,
          },
        },
      },
    },
  };
}
