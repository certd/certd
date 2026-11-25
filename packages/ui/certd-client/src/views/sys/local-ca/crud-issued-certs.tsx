import { compute, CreateCrudOptionsProps, CreateCrudOptionsRet, dict, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { Modal, notification } from "ant-design-vue";
import dayjs from "dayjs";
import { useI18n } from "/src/locales";
import { useModal } from "/@/use/use-modal";
import CertView from "/@/views/certd/pipeline/cert-view.vue";
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

  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    const caId = caIdRef.value;
    if (!caId) {
      return { records: [], total: 0, currentPage: 1, pageSize: 20 };
    }
    const records = ((await localCaApi.ListCerts(caId)) || []).map((item: any) => ({ ...item, rowKey: `${item.type}-${item.id}` }));
    return { records, total: records.length, currentPage: query.page?.currentPage || 1, pageSize: query.page?.pageSize || 20 };
  };

  async function viewCert(row: any) {
    let cert: any;
    if (row.type === "ca") {
      const ca = await localCaApi.GetObj(row.id);
      const res = await localCaApi.GetCertDetail(ca.certPem);
      cert = { crt: ca.certPem, key: "", ic: "", detail: res.detail };
    } else {
      if (!row.crt) {
        notification.error({ message: t("certd.localCa.certNotFound") });
        return;
      }
      const res = await localCaApi.GetCertDetail(row.crt);
      cert = { crt: row.crt, key: "", ic: "", detail: res.detail };
    }
    model.success({
      title: t("certd.localCa.viewTitle"),
      maskClosable: true,
      okText: t("certd.common.confirm"),
      width: 800,
      content: () => <CertView cert={cert} />,
    });
  }

  function revokeCert(row: any) {
    Modal.confirm({
      title: t("certd.localCa.revokeConfirmTitle"),
      content: t("certd.localCa.revokeConfirmContent", { domain: row.domain }),
      okText: t("certd.localCa.revoke"),
      cancelText: t("certd.common.cancel"),
      okButtonProps: { danger: true },
      async onOk() {
        await context.runStepUp(async () => {
          await localCaApi.RevokeCert(caIdRef.value, row.id);
          notification.success({ message: t("certd.localCa.revokeSuccess") });
          await crudExpose.doRefresh();
        });
      },
    });
  }

  return {
    crudOptions: {
      request: { pageRequest },
      search: { show: false },
      toolbar: { show: false },
      actionbar: { show: false },
      table: { rowKey: "rowKey" },
      rowHandle: {
        width: 150,
        buttons: {
          view: {
            type: "link",
            text: t("certd.localCa.certView"),
            click: async ({ row }) => {
              await viewCert(row);
            },
          },
          edit: { show: false },
          remove: { show: false },
          copy: { show: false },
          revoke: {
            type: "link",
            text: t("certd.localCa.revoke"),
            show: compute(({ row }) => row.type !== "ca" && row.status !== "revoked"),
            click: async ({ row }) => {
              revokeCert(row);
            },
          },
        },
      },
      columns: {
        type: {
          title: t("certd.localCa.certType"),
          type: "dict-select",
          dict: dict({
            data: [
              { label: t("certd.localCa.certTypeCa"), value: "ca", color: "purple" },
              { label: t("certd.localCa.certTypeLeaf"), value: "leaf", color: "blue" },
            ],
          }),
          column: { width: 100, component: { color: "auto" } },
        },
        domain: {
          title: t("certd.localCa.certDomain"),
          type: "text",
          column: {
            width: 180,
            ellipsis: true,
            cellRender({ value, row }) {
              const color = row.type === "ca" ? "purple" : "blue";
              return <a-tag color={color}>{value}</a-tag>;
            },
          },
        },
        serialNumber: {
          title: t("certd.localCa.certSerial"),
          type: "text",
          column: {
            width: 240,
            cellRender({ value }) {
              return <fs-copyable modelValue={value || "-"} />;
            },
          },
        },
        status: {
          title: t("certd.localCa.certStatus"),
          type: "text",
          column: {
            width: 100,
            cellRender({ value, row }) {
              let label = t("certd.localCa.certStatusActive");
              let color = "green";
              if (value === "inactive") {
                label = t("certd.localCa.certStatusInactive");
                color = "orange";
                if (row.type === "ca") {
                  label = t("certd.localCa.certStatusDisabled");
                }
              } else if (value === "revoked") {
                label = t("certd.localCa.certStatusRevoked");
                color = "red";
              }
              return <a-tag color={color}>{label}</a-tag>;
            },
          },
        },
        expiresTime: {
          title: t("certd.localCa.certExpires"),
          type: "datetime",
          column: { width: 170, cellRender: ({ value }) => formatTime(value) },
        },
        applyTime: {
          title: t("certd.localCa.certApplyTime"),
          type: "datetime",
          column: { width: 170, cellRender: ({ value }) => formatTime(value) },
        },
      },
    },
  };
}
