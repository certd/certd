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
      { label: t("certd.statusSuccess"), value: "ok", color: "green" },
      { label: t("certd.statusChecking"), value: "checking", color: "blue" },
      { label: t("certd.statusError"), value: "error", color: "red" },
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
            text: t("certd.actionImportBatch"),
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
            text: t("certd.actionSyncIp"),
            type: "primary",
            async click() {
              Modal.confirm({
                title: t("certd.modalTitleSyncIp"),
                content: t("certd.modalContentSyncIp"),
                onOk: async () => {
                  await api.DoSync(context.props.siteId);
                  await crudExpose.doRefresh();
                  notification.success({
                    message: t("certd.notificationSyncComplete"),
                  });
                },
              });
            },
          },
          checkAll: {
            text: t("certd.actionCheckAll"),
            type: "primary",
            click: () => {
              Modal.confirm({
                title: t("certd.modalTitleConfirm"),
                content: t("certd.modalContentCheckAll"),
                onOk: async () => {
                  await siteIpApi.CheckAll(context.props.siteId);
                  notification.success({
                    message: t("certd.notificationCheckSubmitted"),
                    description: t("certd.notificationCheckDescription"),
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
              title: t("certd.tooltipCheckNow"),
            },
            icon: "ion:play-sharp",
            click: async ({ row }) => {
              await api.DoCheck(row.id);
              await crudExpose.doRefresh();
              notification.success({
                message: t("certd.notificationCheckSubmittedPleaseRefresh"),
              });
            },
          },
        },
      },
      columns: {
        id: {
          title: t("certd.columnId"),
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
          title: t("certd.columnIp"),
          search: {
            show: true,
          },
          type: "text",
          form: {
            helper: t("certd.helperIpCname"),
            rules: [{ required: true, message: t("certd.ruleIpRequired") }],
          },
          column: {
            width: 160,
          },
        },
        certDomains: {
          title: t("certd.columnCertDomains"),
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
          title: t("certd.columnCertProvider"),
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
          title: t("certd.columnCertStatus"),
          search: {
            show: true,
          },
          type: "dict-select",
          dict: dict({
            data: [
              { label: t("certd.statusNormal"), value: "ok", color: "green" },
              { label: t("certd.statusExpired"), value: "expired", color: "red" },
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
          title: t("certd.columnCertExpiresTime"),
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
              return <a-progress title={expireDate + " " + t("certd.expired")} percent={percent} strokeColor={color} format={(percent: number) => `${leftDays} ${t("certd.days")}`} />;
            },
          },
        },
        checkStatus: {
          title: t("certd.columnCheckStatus"),
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
          title: t("certd.columnLastCheckTime"),
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
          title: t("certd.columnSource"),
          search: {
            show: false,
          },
          type: "dict-switch",
          dict: dict({
            data: [
              { label: t("certd.sourceSync"), value: "sync", color: "green" },
              { label: t("certd.sourceManual"), value: "manual", color: "blue" },
              { label: t("certd.sourceImport"), value: "import", color: "blue" },
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
          title: t("certd.columnDisabled"),
          search: {
            show: false,
          },
          type: "dict-switch",
          dict: dict({
            data: [
              { label: t("certd.enabled"), value: false, color: "green" },
              { label: t("certd.disabled"), value: true, color: "red" },
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
          title: t("certd.columnRemark"),
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
