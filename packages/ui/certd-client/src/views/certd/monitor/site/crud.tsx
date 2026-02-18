// @ts-ignore
import { useI18n } from "/src/locales";
import { AddReq, ColumnCompositionProps, ColumnProps, compute, CreateCrudOptionsProps, CreateCrudOptionsRet, DataFormatterContext, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { siteInfoApi } from "./api";
import * as settingApi from "./setting/api";
import dayjs from "dayjs";
import { message, Modal, notification } from "ant-design-vue";
import { useSettingStore } from "/@/store/settings";
import { mySuiteApi } from "/@/views/certd/suite/mine/api";
import { mitter } from "/@/utils/util.mitt";
import { useSiteIpMonitor } from "./ip/use";
import { useSiteImport } from "/@/views/certd/monitor/site/use";
import { ref } from "vue";
import GroupSelector from "../../basic/group/group-selector.vue";
import { createGroupDictRef } from "../../basic/group/api";
import { useProjectStore } from "/@/store/project";
import { myProjectDict } from "../../dicts";
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
    delete form.id;
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

  const certValidDaysRef = ref(10);

  async function loadSetting() {
    const setting = await settingApi.SiteMonitorSettingsGet();
    certValidDaysRef.value = setting?.certValidDays || 10;
  }
  loadSetting();

  const selectedRowKeys = ref([]);

  const settingStore = useSettingStore();

  const handleBatchDelete = () => {
    if (selectedRowKeys.value?.length > 0) {
      Modal.confirm({
        title: "确认",
        content: `确定要批量删除这${selectedRowKeys.value.length}条记录吗`,
        async onOk() {
          await api.BatchDelObj(selectedRowKeys.value);
          message.info("删除成功");
          crudExpose.doRefresh();
          selectedRowKeys.value = [];
        },
      });
    } else {
      message.error("请先勾选记录");
    }
  };

  context.handleBatchDelete = handleBatchDelete;

  function checkAll() {
    Modal.confirm({
      title: t("monitor.confirmTitle"), // "确认"
      content: t("monitor.confirmContent"), // "确认触发检查全部站点证书吗?"
      onOk: async () => {
        await siteInfoApi.CheckAll();
        notification.success({
          message: t("monitor.checkSubmitted"), // "检查任务已提交"
          description: t("monitor.pleaseRefresh"), // "请稍后刷新页面查看结果"
        });
      },
    });
  }

  const GroupTypeSite = "site";
  const groupDictRef = createGroupDictRef(GroupTypeSite);

  function getDefaultGroupId() {
    const searchFrom = crudExpose.getSearchValidatedFormData();
    if (searchFrom.groupId) {
      return searchFrom.groupId;
    }
  }

  const projectStore = useProjectStore();
  return {
    id: "siteMonitorCrud",
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest,
      },
      tabs: {
        name: "groupId",
        show: true,
      },
      toolbar: {
        buttons: {
          export: {
            show: true,
          },
        },
        export: {
          dataFrom: "search",
          columnFilter: (col: ColumnProps) => {
            //列过滤器，返回true则导出该列
            //例如： 只导出show=true的列
            return col.show === true;
          },
          dataFormatter: (opts: DataFormatterContext) => {
            //例如 格式化日期
            const { row, originalRow, col, exportCol } = opts;
            const key = col.key;
            const element = originalRow[key];
            if (key.includes("Time") && element) {
              row[key] = dayjs(element).format("YYYY-MM-DD HH:mm:ss");
            }

            if (col.width) {
              exportCol.width = col.width / 10;
            }

            if (col.key === "certInfo" && originalRow?.certProvider) {
              row[key] = originalRow?.certProvider + " " + originalRow?.certDomains;
            }

            //参数说明
            // DataFormatterContext = {row: any,originalRow: any, key: string, col: ColumnProps, exportCol:ExportColumn}
            // row = 当前行数据
            // originalRow = 当前行原始数据
            // key = 当前列的key
            // col = 当前列的配置
            // exportCol = 当前列的导出配置
          },
        },
      },
      pagination: {
        pageSizeOptions: ["10", "20", "50", "100", "200"],
      },
      settings: {
        plugins: {
          //这里使用行选择插件，生成行选择crudOptions配置，最终会与crudOptions合并
          rowSelection: {
            enabled: true,
            props: {
              multiple: true,
              crossPage: false,
              selectedRowKeys: () => {
                return selectedRowKeys;
              },
            },
          },
        },
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
                    message: t("monitor.basicLimitError"),
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
                    message: t("monitor.limitExceeded", { max }),
                  });
                  return;
                }
              }

              const defaultGroupId = getDefaultGroupId();
              await crudExpose.openAdd({
                row: { groupId: defaultGroupId },
              });
            },
          },
          //导入按钮
          import: {
            show: true,
            text: t("monitor.bulkImport"),
            type: "primary",
            async click() {
              const defaultGroupId = getDefaultGroupId();
              openSiteImportDialog({
                defaultGroupId,
                afterSubmit() {
                  crudExpose.doRefresh();
                },
              });
            },
          },
          checkAll: {
            show: true,
            text: t("monitor.checkAll"),
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
                message: t("monitor.checkSubmittedRefresh"),
              });
            },
          },
          ipCheck: {
            order: 10,
            type: "link",
            text: null,
            show: compute(({ row }) => row.ipCheck === true),
            tooltip: {
              title: t("monitor.ipManagement"),
            },
            icon: "entypo:address",
            click: async ({ row }) => {
              openSiteIpMonitorDialog({ siteId: row.id });
            },
          },
        },
      },
      // tabs: {
      //   name: "disabled",
      //   show: true,
      // },
      search: {
        initialForm: {
          ...projectStore.getSearchForm(),
        },
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
          title: t("monitor.siteName"),
          search: {
            show: true,
          },
          type: "text",
          form: {
            rules: [{ required: true, message: t("monitor.enterSiteName") }],
          },
          column: {
            width: 160,
          },
        },
        domain: {
          title: t("monitor.domain"),
          search: {
            show: true,
          },
          type: "text",
          form: {
            rules: [
              { required: true, message: t("monitor.enterDomain") },
              // @ts-ignore
              { type: "domains", message: t("monitor.enterValidDomain") },
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
          title: t("monitor.httpsPort"),
          search: {
            show: false,
          },
          type: "number",
          form: {
            value: 443,
            rules: [{ required: true, message: t("monitor.enterPort") }],
          },
          column: {
            width: 100,
            show: false,
          },
        },
        certInfo: {
          title: t("monitor.certInfo"),
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
                        {t("monitor.issuer")}: {row.certProvider}
                      </div>
                      <div>
                        {t("monitor.certDomains")}: {row.certDomains}
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
          title: t("monitor.certDomains"),
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
          title: t("monitor.certProvider"),
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
          title: t("monitor.certStatus"),
          search: {
            show: true,
          },
          type: "dict-select",
          dict: dict({
            data: [
              { label: t("monitor.status.ok"), value: "ok", color: "green" },
              { label: t("monitor.status.expired"), value: "expired", color: "red" },
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
        checkStatus: {
          title: t("monitor.checkStatus"),
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
        certEffectiveTime: {
          title: t("monitor.certEffectiveTime"),
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
            show: false,
          },
        },
        certExpiresTime: {
          title: t("monitor.certExpiresTime"),
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
          title: t("monitor.remainingValidity"),
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
              const certValidDays = certValidDaysRef.value;
              const { certEffectiveTime: effectiveTime, certExpiresTime: expiresTime } = row || {};
              if (!expiresTime) {
                return "-";
              }
              // 申请时间 ps:此处为证书在certd创建的时间而非实际证书申请时间
              const applyDate = dayjs(effectiveTime ?? Date.now()).format("YYYY-MM-DD");
              // 失效时间
              const expireDate = dayjs(expiresTime).format("YYYY-MM-DD");
              // 有效天数 ps:此处证书最小设置为90d
              let effectiveDays = Math.max(90, dayjs(expiresTime).diff(applyDate, "day"));

              const fixedCertExpireDays = settingStore.getSysPublic?.fixedCertExpireDays;
              if (fixedCertExpireDays && fixedCertExpireDays > 0) {
                effectiveDays = fixedCertExpireDays;
              }

              // 距离失效时间剩余天数
              const leftDays = dayjs(expiresTime).diff(dayjs(), "day");
              const color = leftDays < certValidDays ? "red" : "#389e0d";
              const percent = (leftDays / effectiveDays) * 100;
              // console.log('cellRender', 'effectiveDays', effectiveDays, 'expiresTime', expiresTime, 'applyTime', applyTime, 'percent', percent, row)
              return <a-progress title={expireDate + t("monitor.expired")} percent={percent} strokeColor={color} format={(percent: number) => `${leftDays}${t("monitor.days")}`} />;
            },
          },
        },
        ipAddress: {
          title: t("monitor.ipAddress"),
          search: {
            show: false,
          },
          type: "text",
          form: {
            helper: t("monitor.ipAddressHelper"),
          },
          column: {
            width: 150,
            sorter: true,
          },
        },
        groupId: {
          title: t("certd.fields.group"),
          type: "dict-select",
          search: {
            show: true,
          },
          dict: groupDictRef,
          form: {
            component: {
              name: GroupSelector,
              vModel: "modelValue",
              type: GroupTypeSite,
              onRefresh() {
                groupDictRef.reloadDict();
              },
            },
          },
          column: {
            width: 130,
            align: "center",
            component: {
              color: "auto",
            },
            sorter: true,
          },
        },
        remark: {
          title: t("monitor.remark"),
          search: {
            show: false,
          },
          type: "textarea",
          column: {
            width: 200,
            sorter: true,
            ellipsis: true,
            cellRender({ value }) {
              return <a-tooltip title={value}>{value}</a-tooltip>;
            },
          },
        },
        lastCheckTime: {
          title: t("monitor.lastCheckTime"),
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
          title: t("monitor.disabled"),
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
        ipCheck: {
          title: t("monitor.ipCheck"),
          type: "dict-switch",
          dict: dict({
            data: [
              { label: t("common.enabled"), value: true, color: "green" },
              { label: t("common.disabled"), value: false, color: "gray" },
            ],
          }),
          form: {
            helper: t("monitor.ipCheckHelper"),
            value: false,
            rules: [{ required: true, message: t("monitor.selectRequired") }],
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
                    content: t("monitor.ipCheckConfirm", { status: $event ? t("common.enabled") : t("common.disabled") }),
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
        ipSyncAuto: {
          title: t("monitor.ipSyncAuto"),
          type: "dict-switch",
          dict: dict({
            data: [
              { label: t("common.enabled"), value: true, color: "green" },
              { label: t("common.disabled"), value: false, color: "gray" },
            ],
          }),
          form: {
            value: true,
            show: compute(({ form }) => {
              return form.ipCheck;
            }),
          },
          column: {
            width: 100,
            sorter: true,
            align: "center",
          },
        },
        ipSyncMode: {
          title: t("monitor.ipSyncMode"),
          type: "dict-select",
          dict: dict({
            data: [
              { label: t("monitor.ipSyncModeAll"), value: "all" },
              { label: t("monitor.ipSyncModeIPV4Only"), value: "ipv4" },
              { label: t("monitor.ipSyncModeIPV6Only"), value: "ipv6" },
            ],
          }),
          form: {
            value: "all",
            show: compute(({ form }) => {
              return form.ipSyncAuto;
            }),
            helper: t("monitor.ipSyncModeHelper"),
          },
          column: {
            width: 100,
            sorter: true,
            align: "center",
          },
        },
        ipIgnoreCoherence: {
          title: t("monitor.ipIgnoreCoherence"),
          type: "dict-switch",
          dict: dict({
            data: [
              { label: t("common.enabled"), value: true, color: "green" },
              { label: t("common.disabled"), value: false, color: "gray" },
            ],
          }),
          form: {
            value: false,
            show: compute(({ form }) => {
              return form.ipCheck;
            }),
            helper: t("monitor.ipIgnoreCoherenceHelper"),
          },
          column: {
            width: 100,
            sorter: true,
            align: "center",
          },
        },
        pipelineId: {
          title: t("monitor.pipelineId"),
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
          title: t("monitor.certInfoId"),
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
        error: {
          title: t("monitor.error"),
          search: {
            show: false,
          },
          type: "text",
          form: { show: false },
          column: {
            width: 200,
            sorter: true,
            cellRender({ value }) {
              return <a-tooltip title={value}>{value}</a-tooltip>;
            },
          },
        },
        projectId: {
          title: t("certd.fields.projectName"),
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
