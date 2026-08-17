import { ColumnProps, DataFormatterContext, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, UserPageQuery, UserPageRes, dict } from "@fast-crud/fast-crud";
import { Modal } from "ant-design-vue";
import { useI18n } from "/src/locales";
import { useDicts } from "/@/views/certd/dicts";

const typeDict = dict({
  url: "/sys/audit/dict",
  getData: async () => {
    const { createSysAuditApi } = await import("./api");
    const api = createSysAuditApi();
    const res = await api.GetDict();
    return res.types || [];
  },
});

const actionDict = dict({
  url: "/sys/audit/dict",
  getData: async () => {
    const { createSysAuditApi } = await import("./api");
    const api = createSysAuditApi();
    const res = await api.GetDict();
    return res.actions || [];
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

  const cleanExpired = async () => {
    Modal.confirm({
      title: "确认清理",
      content: "确定要清理90天前的审计日志吗？此操作不可撤销。",
      okText: "确认清理",
      okType: "danger",
      cancelText: "取消",
      async onOk() {
        await api.Clean(90);
        crudExpose.doRefresh();
      },
    });
  };

  return {
    crudOptions: {
      request: { pageRequest, delRequest },
      tabs: {
        name: "scope",
        show: true,
        dict: {
          data: [
            { value: "system", label: "系统级", color: "red" },
            { value: "user", label: "用户级", color: "blue" },
          ],
        },
      },
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
          clean: {
            text: "清理过期日志(90天)",
            type: "primary",
            danger: true,
            click: cleanExpired,
          },
        },
      },
      rowHandle: {
        width: 120,
        fixed: "right",
        buttons: {
          view: { show: false },
          edit: { show: false },
          remove: { show: true },
          copy: { show: false },
        },
      },
      search: {
        initialForm: { scope: "system" },
      },
      columns: {
        id: {
          title: "ID",
          type: "number",
          column: { width: 80 },
          form: { show: false },
        },
        createTime: {
          title: "操作时间",
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
        username: {
          title: "操作人",
          type: "text",
          search: { show: true },
          column: { width: 120 },
          form: { show: false },
        },
        type: {
          title: "类型",
          type: "dict-select",
          dict: typeDict,
          search: { show: true },
          column: { width: 120 },
          form: { show: false },
        },
        action: {
          title: "操作",
          type: "text",
          search: { show: true },
          column: { width: 200, tooltip: true },
          form: { show: false },
        },
        success: {
          title: "结果",
          type: "dict-switch",
          dict: dict({
            data: [
              { value: true, label: "成功", color: "success" },
              { value: false, label: "失败", color: "error" },
            ],
          }),
          column: { width: 100, align: "center" },
          form: { show: false },
          search: { show: true },
        },
        content: {
          title: "备注",
          type: "text",
          search: { show: true },
          column: { width: 500, tooltip: true },
          form: { show: false },
        },
        ipAddress: {
          title: "IP地址",
          type: "text",
          column: { width: 140 },
          form: { show: false },
        },
        projectId: {
          title: t("certd.fields.projectName"),
          type: "dict-select",
          dict: myProjectDict,
          form: {
            show: false,
          },
        },
        scope: {
          title: "范围",
          type: "dict-select",
          dict: dict({
            data: [
              { value: "system", label: "系统级", color: "blue" },
              { value: "user", label: "用户级", color: "green" },
            ],
          }),
          search: { show: true },
          column: { width: 100 },
          form: { show: false },
        },
      },
    },
  };
}
