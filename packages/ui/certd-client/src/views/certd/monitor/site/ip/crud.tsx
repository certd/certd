// @ts-ignore
import { useI18n } from "/src/locales";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { siteIpApi } from "./api";
import dayjs from "dayjs";
import { Modal, notification } from "ant-design-vue";
import { useSiteIpMonitor } from "/@/views/certd/monitor/site/ip/use";

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { t } = useI18n();
  const api = siteIpApi;

  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    if (!query.query) {
      query.query = {};
    }
    query.query.siteId = context.props.siteId;
    return await api.GetList(query);
  };
  const editRequest = async (req: EditReq) => {
    const { form, row } = req;
    form.id = row.id;
    const res = await api.UpdateObj(form);
    return res;
  };
  const delRequest = async (req: DelReq) => {
    const { row } = req;
    return await api.DelObj(row.id);
  };

  const addRequest = async (req: AddReq) => {
    const { form } = req;
    form.siteId = context.props.siteId;
    const res = await api.AddObj(form);
    return res;
  };

  const checkStatusDict = dict({
    data: [
      { label: t("certd.monitor.statusSuccess"), value: "ok", color: "green" },
      { label: t("certd.monitor.statusChecking"), value: "checking", color: "blue" },
      { label: t("certd.monitor.statusError"), value: "error", color: "red" },
    ],
  });
  const { openSiteIpImportDialog } = useSiteIpMonitor();
  return {
    crudOptions: {
      id: "siteIpCrud",
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest,
      },
      form: {
        labelCol: {
          //固定label宽度
          span: null,
          style: {
            width: "100px",
          },
        },
        col: {
          span: 22,
        },
        wrapper: {
          width: 600,
        },
      },
      actionbar: {
        buttons: {
          add: {
            async click() {
              await crudExpose.openAdd({});
            },
          },
          import: {
            show: true,
            text: t("certd.monitor.actionImportBatch"),
            type: "primary",
            async click() {
              openSiteIpImportDialog({
                siteId: context.props.siteId,
                afterSubmit() {
                  crudExpose.doRefresh();
                },
              });
            },
          },
          load: {
            text: t("certd.monitor.actionSyncIp"),
            type: "primary",
            async click() {
              Modal.confirm({
                title: t("certd.monitor.modalTitleSyncIp"),
                content: t("certd.monitor.modalContentSyncIp"),
                onOk: async () => {
                  await api.DoSync(context.props.siteId);
                  await crudExpose.doRefresh();
                  notification.success({
                    message: t("certd.monitor.notificationSyncComplete"),
                  });
                },
              });
            },
          },
          checkAll: {
            text: t("certd.monitor.actionCheckAll"),
            type: "primary",
            click: () => {
              Modal.confirm({
                title: t("certd.monitor.modalTitleConfirm"),
                content: t("certd.monitor.modalContentCheckAll"),
                onOk: async () => {
                  await siteIpApi.CheckAll(context.props.siteId);
                  notification.success({
                    message: t("certd.monitor.notificationCheckSubmitted"),
                    description: t("certd.monitor.notificationCheckDescription"),
                  });
                },
              });
            },
          },
        },
      },
      rowHandle: {
        fixed: "right",
        width: 240,
        buttons: {
          check: {
            order: 0,
            type: "link",
            text: null,
            tooltip: {
              title: t("certd.monitor.tooltipCheckNow"),
            },
            icon: "ion:play-sharp",
            click: async ({ row }) => {
              await api.DoCheck(row.id);
              await crudExpose.doRefresh();
              notification.success({
                message: t("certd.monitor.notificationCheckSubmittedPleaseRefresh"),
              });
            },
          },
        },
      },
      columns: {
        id: {
          title: t("certd.monitor.columnId"),
          key: "id",
          type: "number",
          search: {
            show: false,
          },
          column: {
            width: 80,
            align: "center",
          },
          form: {
            show: false,
          },
        },
        ipAddress: {
          title: t("certd.monitor.columnIp"),
          search: {
            show: true,
          },
          type: "text",
          form: {
            helper: t("certd.monitor.helperIpCname"),
            rules: [{ required: true, message: t("certd.monitor.ruleIpRequired") }],
          },
          column: {
            width: 160,
          },
        },
        certDomains: {
          title: t("certd.monitor.columnCertDomains"),
          search: {
            show: false,
          },
          type: "text",
          form: {
            show: false,
          },
          column: {
            width: 200,
            sorter: true,
            show: false,
            cellRender({ value }) {
              return (
                <a-tooltip title={value} placement="left">
                  {value}
                </a-tooltip>
              );
            },
          },
        },
        certProvider: {
          title: t("certd.monitor.columnCertProvider"),
          search: {
            show: false,
          },
          type: "text",
          form: {
            show: false,
          },
          column: {
            width: 200,
            show: false,
            sorter: true,
            cellRender({ value }) {
              return <a-tooltip title={value}>{value}</a-tooltip>;
            },
          },
        },
        certStatus: {
          title: t("certd.monitor.columnCertStatus"),
          search: {
            show: true,
          },
          type: "dict-select",
          dict: dict({
            data: [
              { label: t("certd.monitor.statusNormal"), value: "ok", color: "green" },
              { label: t("certd.monitor.statusExpired"), value: "expired", color: "red" },
            ],
          }),
          form: {
            show: false,
          },
          column: {
            width: 100,
            sorter: true,
            show: true,
            align: "center",
          },
        },
        certExpiresTime: {
          title: t("certd.monitor.columnCertExpiresTime"),
          search: {
            show: false,
          },
          type: "date",
          form: {
            show: false,
          },
          column: {
            sorter: true,
            cellRender({ value }) {
              if (!value) {
                return "-";
              }
              const expireDate = dayjs(value).format("YYYY-MM-DD");
              const leftDays = dayjs(value).diff(dayjs(), "day");
              const color = leftDays < 20 ? "red" : "#389e0d";
              const percent = (leftDays / 90) * 100;
              return <a-progress title={expireDate + " " + t("certd.common.expired")} percent={percent} strokeColor={color} format={(percent: number) => `${leftDays} ${t("certd.common.days")}`} />;
            },
          },
        },
        checkStatus: {
          title: t("certd.monitor.columnCheckStatus"),
          search: {
            show: false,
          },
          type: "dict-select",
          dict: checkStatusDict,
          form: {
            show: false,
          },
          column: {
            width: 100,
            align: "center",
            sorter: true,
            cellRender({ value, row, key }) {
              return (
                <a-tooltip title={row.error}>
                  <fs-values-format v-model={value} dict={checkStatusDict}></fs-values-format>
                </a-tooltip>
              );
            },
          },
        },
        lastCheckTime: {
          title: t("certd.monitor.columnLastCheckTime"),
          search: {
            show: false,
          },
          type: "datetime",
          form: {
            show: false,
          },
          column: {
            sorter: true,
            width: 155,
          },
        },
        from: {
          title: t("certd.monitor.columnSource"),
          search: {
            show: false,
          },
          type: "dict-switch",
          dict: dict({
            data: [
              { label: t("certd.monitor.sourceSync"), value: "sync", color: "green" },
              { label: t("certd.monitor.sourceManual"), value: "manual", color: "blue" },
              { label: t("certd.monitor.sourceImport"), value: "import", color: "blue" },
            ],
          }),
          form: {
            value: false,
          },
          column: {
            width: 100,
            sorter: true,
            align: "center",
          },
        },
        disabled: {
          title: t("certd.monitor.columnDisabled"),
          search: {
            show: false,
          },
          type: "dict-switch",
          dict: dict({
            data: [
              { label: t("certd.common.enabled"), value: false, color: "green" },
              { label: t("certd.common.disabled"), value: true, color: "red" },
            ],
          }),
          form: {
            value: false,
          },
          column: {
            width: 100,
            sorter: true,
            align: "center",
          },
        },
        remark: {
          title: t("certd.monitor.columnRemark"),
          search: {
            show: false,
          },
          type: "text",
          form: {
            show: false,
          },
          column: {
            ellipsis: true,
            width: 200,
            sorter: true,
            tooltip: true,
          },
        },
      },
    },
  };
}
