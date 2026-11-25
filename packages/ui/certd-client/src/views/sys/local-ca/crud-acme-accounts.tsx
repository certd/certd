import { compute, CreateCrudOptionsProps, CreateCrudOptionsRet, dict, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { Modal, notification } from "ant-design-vue";
import dayjs from "dayjs";
import { useI18n } from "/src/locales";
import { request } from "/@/api/service";
import { useModal } from "/@/use/use-modal";
import CertView from "/@/views/certd/pipeline/cert-view.vue";
import { getSecretAccessToken } from "/@/views/certd/access/api";
import { localCaApi } from "./api";

function formatTime(value: any) {
  if (!value) {
    return "-";
  }
  return dayjs(Number(value) || value).format("YYYY-MM-DD HH:mm:ss");
}

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { t } = useI18n();
  const model = useModal();
  const caIdRef = context.caIdRef;
  let users: any[] = [];
  let projects: any[] = [];

  function userLabel(id: number) {
    const user = users.find(item => Number(item.id) === Number(id));
    if (!user) {
      return `#${id}`;
    }
    return user.nickName || user.username || (user.phoneCode ? `${user.phoneCode}${user.mobile || ""}` : user.mobile) || `#${id}`;
  }
  function projectLabel(id: number) {
    const project = projects.find(item => Number(item.id) === Number(id));
    if (project) {
      return project.name;
    }
    return `#${id}`;
  }

  let latestRequest: Promise<UserPageRes> | null = null;
  const fetchPage = async (query: UserPageQuery): Promise<UserPageRes> => {
    const caId = caIdRef.value;
    if (!caId) {
      return { records: [], total: 0, currentPage: 1, pageSize: 20 };
    }
    const records = (await localCaApi.ListAcmeAccounts(caId)) || [];
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

  function orderStatusColor(status: string) {
    if (status === "valid") {
      return "green";
    }
    if (status === "invalid") {
      return "red";
    }
    if (status === "ready") {
      return "blue";
    }
    return "orange";
  }
  function orderStatusLabel(status: string) {
    const map: Record<string, string> = {
      pending: t("certd.localCa.orderStatusPending"),
      ready: t("certd.localCa.orderStatusReady"),
      processing: t("certd.localCa.orderStatusProcessing"),
      valid: t("certd.localCa.orderStatusValid"),
      invalid: t("certd.localCa.orderStatusInvalid"),
    };
    return map[status] || status;
  }
  function orderStatusHint(status: string) {
    const map: Record<string, string> = {
      pending: t("certd.localCa.orderPendingHint"),
      ready: t("certd.localCa.orderReadyHint"),
      processing: t("certd.localCa.orderProcessingHint"),
      valid: t("certd.localCa.orderValidHint"),
      invalid: t("certd.localCa.orderInvalidHint"),
    };
    return map[status] || status;
  }

  async function viewOrderCert(record: any) {
    if (!record.certPem) {
      return;
    }
    const res = await localCaApi.GetCertDetail(record.certPem);
    model.success({
      title: t("certd.localCa.viewTitle"),
      maskClosable: true,
      okText: t("certd.common.confirm"),
      width: 800,
      zIndex: 1200,
      content: () => <CertView cert={{ crt: record.certPem, key: "", ic: "", detail: res.detail }} />,
    });
  }

  // 订单为轻量只读展示，使用 a-table 即可
  async function viewOrders(record: any) {
    const orders = (await localCaApi.ListAcmeOrders(caIdRef.value, record.id)) || [];
    model.success({
      title: `${t("certd.localCa.acmeOrdersTitle")} - ${record.id}`,
      maskClosable: true,
      okText: t("certd.common.close"),
      width: 1000,
      zIndex: 1000,
      content: () => (
        <a-table dataSource={orders} pagination={{ pageSize: 10 }} size="small" rowKey="id">
          <a-table-column title={t("certd.localCa.acmeOrderStatus")} width={110}>
            {{
              default: ({ record: order }: any) => (
                <a-tooltip title={orderStatusHint(order.status)}>
                  <a-tag color={orderStatusColor(order.status)}>{orderStatusLabel(order.status)}</a-tag>
                </a-tooltip>
              ),
            }}
          </a-table-column>
          <a-table-column title={t("certd.localCa.certDomain")} width={220}>
            {{ default: ({ record: order }: any) => (order.identifiers || []).map((item: any) => item.value).join(", ") }}
          </a-table-column>
          <a-table-column title={t("certd.localCa.certSerial")} dataIndex="serialNumber" width={240} />
          <a-table-column title={t("certd.localCa.eabOrderType")} width={100} align="center">
            {{
              default: ({ record: order }: any) => <a-tag color={order.directIssue ? "green" : "default"}>{order.directIssue ? t("certd.localCa.orderDirectIssueYes") : t("certd.localCa.orderDirectIssueNo")}</a-tag>,
            }}
          </a-table-column>
          <a-table-column title={t("certd.common.createTime")} width={180}>
            {{ default: ({ record: order }: any) => <span style={{ whiteSpace: "nowrap" }}>{formatTime(order.createTime)}</span> }}
          </a-table-column>
          <a-table-column title={t("certd.localCa.accessActions")} width={120} align="center">
            {{
              default: ({ record: order }: any) =>
                order.certPem ? (
                  <a-button type="link" size="small" onClick={() => viewOrderCert(order)}>
                    {t("certd.localCa.viewCertInfo")}
                  </a-button>
                ) : (
                  <span>-</span>
                ),
            }}
          </a-table-column>
        </a-table>
      ),
    });
  }

  function toggleStatus(row: any) {
    const status = row.status === "valid" ? "deactivated" : "valid";
    let title = t("certd.localCa.acmeDisableConfirm");
    if (status === "valid") {
      title = t("certd.localCa.acmeEnableConfirm");
    }
    Modal.confirm({
      title,
      content: t("certd.localCa.acmeStatusConfirmHint"),
      okText: t("certd.common.confirm"),
      cancelText: t("certd.common.cancel"),
      async onOk() {
        await localCaApi.SetAcmeAccountStatus(caIdRef.value, row.id, status, status === "valid" ? getSecretAccessToken() : undefined);
        notification.success({ message: t("certd.localCa.acmeStatusChanged") });
        await crudExpose.doRefresh();
      },
    });
  }

  return {
    crudOptions: {
      request: { pageRequest },
      search: { show: false },
      toolbar: { show: false },
      actionbar: { show: false },
      table: { rowKey: "id" },
      rowHandle: { show: false },
      columns: {
        status: {
          title: t("certd.localCa.acmeStatus"),
          type: "dict-select",
          dict: dict({
            data: [
              { label: t("certd.localCa.acmeAccountValid"), value: "valid", color: "green" },
              { label: t("certd.localCa.acmeAccountDisabled"), value: "deactivated", color: "orange" },
            ],
          }),
          column: { width: 100, component: { color: "auto" } },
        },
        id: { title: t("certd.localCa.acmeAccountId"), type: "text", column: { width: 200, ellipsis: true } },
        eabKid: {
          title: t("certd.localCa.acmeAccountEab"),
          type: "text",
          column: {
            width: 200,
            cellRender({ row }) {
              if (!row.eabId) {
                return <a-tag color="red">{t("certd.localCa.acmeAccountNoEab")}</a-tag>;
              }
              return (
                <span>
                  <a-tooltip title={row.eabKid}>
                    <span>{row.eabName || row.eabKid}</span>
                  </a-tooltip>
                  {row.eabPrivileged ? (
                    <a-tag color="orange" style={{ marginLeft: 4 }}>
                      {t("certd.localCa.eabTypePrivileged")}
                    </a-tag>
                  ) : null}
                  {row.eabDisabled ? (
                    <a-tag color="red" style={{ marginLeft: 4 }}>
                      {t("common.disabled")}
                    </a-tag>
                  ) : null}
                </span>
              );
            },
          },
        },
        userId: {
          title: t("certd.localCa.acmeOwner"),
          type: "text",
          column: {
            width: 180,
            cellRender({ row }) {
              if (!(Number(row.userId) > 0)) {
                return (
                  <a-tooltip title={t("certd.localCa.systemLevelHint")}>
                    <a-tag color="purple">{t("certd.localCa.systemLevelTag")}</a-tag>
                  </a-tooltip>
                );
              }
              if (row.projectId) {
                return `${userLabel(row.userId)} / ${projectLabel(row.projectId)}`;
              }
              return userLabel(row.userId);
            },
          },
        },
        contact: {
          title: t("certd.localCa.acmeContact"),
          type: "text",
          column: { width: 180, ellipsis: true, cellRender: ({ value }) => (value || []).join(", ") || "-" },
        },
        orderCount: { title: t("certd.localCa.acmeOrders"), type: "number", column: { width: 100, align: "center" } },
        issuedCount: { title: t("certd.localCa.acmeIssued"), type: "number", column: { width: 100, align: "center" } },
        createTime: {
          title: t("certd.common.createTime"),
          type: "datetime",
          column: { width: 170, cellRender: ({ value }) => formatTime(value) },
        },
        actions: {
          title: t("certd.localCa.certActions"),
          type: "text",
          column: {
            width: 220,
            cellRender({ row }) {
              return (
                <div class="local-ca-row-actions">
                  {row.eabId ? (
                    <a-button type="link" size="small" onClick={() => viewEab(row)}>
                      {t("certd.localCa.acmeViewEab")}
                    </a-button>
                  ) : null}
                  <a-button type="link" size="small" onClick={() => viewOrders(row)}>
                    {t("certd.localCa.acmeViewOrders")}
                  </a-button>
                  <a-button type="link" size="small" danger={row.status === "valid"} onClick={() => toggleStatus(row)}>
                    {row.status === "valid" ? t("certd.common.disabled") : t("certd.common.enabled")}
                  </a-button>
                </div>
              );
            },
          },
        },
      },
    },
  };
}
