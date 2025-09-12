// @ts-ignore
import { useI18n } from "/src/locales";
import { AddReq, ColumnCompositionProps, compute, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { siteInfoApi } from "./api";
import dayjs from "dayjs";
import { Modal, notification } from "ant-design-vue";
import { useSettingStore } from "/@/store/settings";
import { mySuiteApi } from "/@/views/certd/suite/mine/api";
import { mitter } from "/@/utils/util.mitt";
import { useSiteIpMonitor } from "./ip/use";
import { useSiteImport } from "/@/views/certd/monitor/site/use";

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { t } = useI18n();
  const api = siteInfoApi;
  const { crudBinding } = crudExpose;
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
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
    const res = await api.AddObj(form);
    return res;
  };

  const settingsStore = useSettingStore();

  const checkStatusDict = dict({
    data: [
      { label: t("certd.checkStatus.success"), value: "ok", color: "green" },
      { label: t("certd.checkStatus.checking"), value: "checking", color: "blue" },
      { label: t("certd.checkStatus.error"), value: "error", color: "red" },
    ],
  });

  const { openSiteIpMonitorDialog } = useSiteIpMonitor();
  const { openSiteImportDialog } = useSiteImport();

  function checkAll() {
    Modal.confirm({
      title: t("certd.monitor.confirmTitle"), // "确认"
      content: t("certd.monitor.confirmContent"), // "确认触发检查全部站点证书吗?"
      onOk: async () => {
        await siteInfoApi.CheckAll();
        notification.success({
          message: t("certd.monitor.checkSubmitted"), // "检查任务已提交"
          description: t("certd.monitor.pleaseRefresh"), // "请稍后刷新页面查看结果"
        });
      },
    });
  }
  return {
    id: "siteMonitorCrud",
    crudOptions: {
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
              if (!settingsStore.isPlus) {
                // 非plus
                if (crudBinding.value.data.length >= 1) {
                  notification.error({
                    message: t("certd.monitor.basicLimitError"),
                  });
                  mitter.emit("openVipModal");
                  return;
                }
              }

              //检查是否监控站点数量超出限制
              if (settingsStore.isComm && settingsStore.suiteSetting.enabled) {
                // 检查数量是否超限
                const suiteDetail = await mySuiteApi.SuiteDetailGet();
                const max = suiteDetail.monitorCount.max;
                if (max != -1 && max <= suiteDetail.monitorCount.used) {
                  notification.error({
                    message: t("certd.monitor.limitExceeded", { max }),
                  });
                  return;
                }
              }

              await crudExpose.openAdd({});
            },
          },
          //导入按钮
          import: {
            show: true,
            text: t("certd.monitor.bulkImport"),
            type: "primary",
            async click() {
              openSiteImportDialog({
                afterSubmit() {
                  crudExpose.doRefresh();
                },
              });
            },
          },
          checkAll: {
            show: true,
            text: t("certd.monitor.checkAll"),
            type: "primary",
            click() {
              checkAll();
            },
          },
        },
      },
      rowHandle: {
        fixed: "right",
        width: 280,
        buttons: {
          check: {
            order: 0,
            type: "link",
            text: null,
            tooltip: {
              title: "立即检查",
            },
            icon: "ion:play-sharp",
            click: async ({ row }) => {
              await api.DoCheck(row.id);
              await crudExpose.doRefresh();
              notification.success({
                message: t("certd.monitor.checkSubmittedRefresh"),
              });
            },
          },
          ipCheck: {
            order: 10,
            type: "link",
            text: null,
            show: compute(({ row }) => row.ipCheck === true),
            tooltip: {
              title: t("certd.monitor.ipManagement"),
            },
            icon: "entypo:address",
            click: async ({ row }) => {
              openSiteIpMonitorDialog({ siteId: row.id });
            },
          },
        },
      },
      tabs: {
        name: "disabled",
        show: true,
      },
      columns: {
        id: {
          title: "ID",
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
        name: {
          title: t("certd.monitor.siteName"),
          search: {
            show: true,
          },
          type: "text",
          form: {
            rules: [{ required: true, message: t("certd.monitor.enterSiteName") }],
          },
          column: {
            width: 160,
          },
        },
        domain: {
          title: t("certd.monitor.domain"),
          search: {
            show: true,
          },
          type: "text",
          form: {
            rules: [
              { required: true, message: t("certd.monitor.enterDomain") },
              // @ts-ignore
              { type: "domains", message: t("certd.monitor.enterValidDomain") },
            ],
          },
          column: {
            width: 230,
            sorter: true,
            cellRender({ value, row }) {
              const url = `https://${value}:${row.httpsPort}`;
              return (
                <a-tooltip title={value} placement="left">
                  <fs-copyable modelValue={value}>
                    <a target="_blank" href={url}>
                      {value}:{row.httpsPort}
                    </a>
                  </fs-copyable>
                </a-tooltip>
              );
            },
          },
        },
        httpsPort: {
          title: t("certd.monitor.httpsPort"),
          search: {
            show: false,
          },
          type: "number",
          form: {
            value: 443,
            rules: [{ required: true, message: t("certd.monitor.enterPort") }],
          },
          column: {
            width: 100,
            show: false,
          },
        },
        certInfo: {
          title: t("certd.monitor.certInfo"),
          type: "text",
          form: { show: false },
          column: {
            width: 200,
            sorter: false,
            show: true,
            conditionalRender: false,
            cellRender({ value, row }) {
              const slots = {
                content() {
                  return (
                    <div>
                      <div>
                        {t("certd.monitor.issuer")}: {row.certProvider}
                      </div>
                      <div>
                        {t("certd.monitor.certDomains")}: {row.certDomains}
                      </div>
                    </div>
                  );
                },
              };
              return (
                <a-popover placement={"left"} v-slots={slots} overlayStyle={{ maxWidth: "30%" }}>
                  {row.certDomains}
                </a-popover>
              );
            },
          },
        },
        certDomains: {
          title: t("certd.monitor.certDomains"),
          search: {
            show: true,
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
          title: t("certd.monitor.certProvider"),
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
              return <a-tooltip title={value}>{value}</a-tooltip>;
            },
          },
        },
        certStatus: {
          title: t("certd.monitor.certStatus"),
          search: {
            show: true,
          },
          type: "dict-select",
          dict: dict({
            data: [
              { label: t("certd.monitor.status.ok"), value: "ok", color: "green" },
              { label: t("certd.monitor.status.expired"), value: "expired", color: "red" },
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
        certEffectiveTime: {
          title: t("certd.monitor.certEffectiveTime"),
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
        certExpiresTime: {
          title: t("certd.monitor.certExpiresTime"),
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
        remainingValidity: {
          title: t("certd.monitor.remainingValidity"),
          search: {
            show: false,
          },
          type: "date",
          form: {
            show: false,
          },
          column: {
            conditionalRender: false,
            cellRender({ row }) {
              const {
                certEffectiveTime: effectiveTime,
                certExpiresTime: expiresTime,
              } = row || {};
              if (!expiresTime) {
                return "-";
              }
              // 申请时间 ps:此处为证书在certd创建的时间而非实际证书申请时间
              const applyDate = dayjs(effectiveTime ?? Date.now()).format("YYYY-MM-DD");
              // 失效时间
              const expireDate = dayjs(expiresTime).format("YYYY-MM-DD");
              // 有效天数 ps:此处证书最小设置为90d
              const effectiveDays = Math.max(90, dayjs(expiresTime).diff(applyDate, "day"));
              // 距离失效时间剩余天数
              const leftDays = dayjs(expiresTime).diff(dayjs(), "day");
              const color = leftDays < 20 ? "red" : "#389e0d";
              const percent = (leftDays / effectiveDays) * 100;
              // console.log('cellRender', 'effectiveDays', effectiveDays, 'expiresTime', expiresTime, 'applyTime', applyTime, 'percent', percent, row)
              return <a-progress title={expireDate + t("certd.monitor.expired")} percent={percent} strokeColor={color} format={(percent: number) => `${leftDays}${t("certd.monitor.days")}`} />;
            },
          },
        },
        lastCheckTime: {
          title: t("certd.monitor.lastCheckTime"),
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
        disabled: {
          title: t("certd.monitor.disabled"),
          search: {
            show: false,
          },
          type: "dict-switch",
          dict: dict({
            data: [
              { label: t("common.enabled"), value: false, color: "green" },
              { label: t("common.disabled"), value: true, color: "red" },
            ],
          }),
          form: {
            value: false,
          },
          column: {
            width: 100,
            sorter: true,
            align: "center",
            component: {
              name: "fs-dict-switch",
              vModel: "checked",
              on: {
                async change({ row, $event }) {
                  await api.DisabledChange(row.id, $event);
                  await crudExpose.doRefresh();
                },
              },
            },
          },
        },
        ipCheck: {
          title: t("certd.monitor.ipCheck"),
          type: "dict-switch",
          dict: dict({
            data: [
              { label: t("common.enabled"), value: true, color: "green" },
              { label: t("common.disabled"), value: false, color: "gray" },
            ],
          }),
          form: {
            value: false,
            rules: [{ required: true, message: t("certd.monitor.selectRequired") }],
          },
          column: {
            align: "center",
            width: 100,
            conditionalRender: false,
            component: {
              name: "fs-dict-switch",
              vModel: "checked",
              on: {
                change({ row, $event }) {
                  Modal.confirm({
                    title: t("common.confirm"),
                    content: t("certd.monitor.ipCheckConfirm", { status: $event ? t("common.enabled") : t("common.disabled") }),
                    onOk: async () => {
                      await api.IpCheckChange(row.id, $event);
                      await crudExpose.doRefresh();
                      if ($event) {
                        openSiteIpMonitorDialog({ siteId: row.id });
                      }
                    },
                    onCancel: async () => {
                      await crudExpose.doRefresh();
                    },
                  });
                },
              },
            },
          },
        } as ColumnCompositionProps,
        ipCount: {
          title: t("certd.monitor.ipCount"),
          search: {
            show: false,
          },
          type: "text",
          form: {
            show: false,
          },
          column: {
            width: 100,
            sorter: true,
            align: "center",
          },
        },
        checkStatus: {
          title: t("certd.monitor.checkStatus"),
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
            cellRender({ value, row }) {
              return (
                <a-tooltip title={row.error}>
                  <fs-values-format v-model={value} dict={checkStatusDict}></fs-values-format>
                </a-tooltip>
              );
            },
          },
        },
        // error: {
        //   title: "错误信息",
        //   search: {
        //     show: false
        //   },
        //   type: "text",
        //   form: {
        //     show: false
        //   },
        //   column: {
        //     width: 200,
        //     sorter: true,
        //     cellRender({ value }) {
        //       return <a-tooltip title={value}>{value}</a-tooltip>;
        //     }
        //   }
        // },
        pipelineId: {
          title: t("certd.monitor.pipelineId"),
          search: {
            show: false,
          },
          form: { show: false },
          type: "number",
          column: {
            width: 200,
            sorter: true,
            show: false,
          },
        },
        certInfoId: {
          title: t("certd.monitor.certInfoId"),
          search: {
            show: false,
          },
          type: "number",
          form: { show: false },
          column: {
            width: 100,
            sorter: true,
            show: false,
          },
        },
      },
    },
  };
}
