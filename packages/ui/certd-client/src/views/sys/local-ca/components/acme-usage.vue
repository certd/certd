<template>
  <div class="local-ca-acme-usage">
    <div class="acme-usage-toolbar">
      <a-button type="primary" @click="openCreatePipeline">{{ t("certd.localCa.acmeUsageCreatePipeline") }}</a-button>
      <a-button @click="load">{{ t("certd.localCa.refresh") }}</a-button>
    </div>

    <div class="acme-usage-section">{{ t("certd.localCa.acmeUsageMyEab") }}</div>
    <a-table v-if="eabs.length" :data-source="eabs" :loading="loading" :pagination="false" row-key="id" size="small">
      <a-table-column :title="t('certd.localCa.eabName')" data-index="name" :width="160" ellipsis />
      <a-table-column :title="t('certd.localCa.eabCa')" :width="160" ellipsis>
        <template #default="{ record }">{{ record.caName || `#${record.caId}` }}</template>
      </a-table-column>
      <a-table-column title="KID" :width="200" ellipsis>
        <template #default="{ record }"><fs-copyable :model-value="record.kid" /></template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.eabAllowedDomains')" :width="200" ellipsis>
        <template #default="{ record }">{{ domainsText(record) }}</template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.eabType')" :width="100">
        <template #default="{ record }">
          <a-tag :color="record.privileged ? 'orange' : 'default'">{{ record.privileged ? t("certd.localCa.eabTypePrivileged") : t("certd.localCa.eabTypeNormal") }}</a-tag>
        </template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.certExpires')" :width="170">
        <template #default="{ record }">{{ formatTime(record.expiresTime) }}</template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.certActions')" :width="240">
        <template #default="{ record }">
          <div class="local-ca-row-actions">
            <a-button type="link" size="small" @click="viewSecret(record)">{{ t("certd.localCa.acmeUsageCopySecret") }}</a-button>
            <a-button type="link" size="small" @click="openCreateAccount(record)">{{ t("certd.localCa.acmeUsageCreateAccount") }}</a-button>
          </div>
        </template>
      </a-table-column>
    </a-table>
    <a-empty v-else :description="t('certd.localCa.acmeUsageNoEab')" />

    <div class="acme-usage-section">{{ t("certd.localCa.acmeUsageMyAccounts") }}</div>
    <a-table v-if="accounts.length" :data-source="accounts" :loading="loading" :pagination="false" row-key="id" size="small">
      <a-table-column :title="t('certd.localCa.acmeAccountId')" data-index="id" :width="200" ellipsis />
      <a-table-column :title="t('certd.localCa.eabCa')" :width="160" ellipsis>
        <template #default="{ record }">{{ record.caName || `#${record.caId}` }}</template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.acmeAccountEab')" :width="160" ellipsis>
        <template #default="{ record }">{{ record.eabName || record.eabKid || "-" }}</template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.acmeEmail')" :width="180" ellipsis>
        <template #default="{ record }">{{ emailText(record) }}</template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.acmeStatus')" :width="90">
        <template #default="{ record }">
          <a-tag :color="record.status === 'valid' ? 'green' : 'orange'">{{ record.status === "valid" ? t("certd.localCa.acmeAccountValid") : t("certd.localCa.acmeAccountDisabled") }}</a-tag>
        </template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.acmeOrders')" data-index="orderCount" :width="80" align="center" />
      <a-table-column :title="t('certd.localCa.acmeIssued')" data-index="issuedCount" :width="80" align="center" />
      <a-table-column :title="t('certd.common.createTime')" :width="170">
        <template #default="{ record }">{{ formatTime(record.createTime) }}</template>
      </a-table-column>
      <a-table-column :title="t('certd.localCa.certActions')" :width="180">
        <template #default="{ record }">
          <div class="local-ca-row-actions">
            <a-button type="link" size="small" @click="viewOrders(record)">{{ t("certd.localCa.acmeViewOrders") }}</a-button>
            <a-button v-if="record.eabId" type="link" size="small" @click="viewEab(record)">{{ t("certd.localCa.acmeViewEab") }}</a-button>
            <a-button v-if="record.acmeMode === 'standard'" type="link" size="small" @click="exportAccount(record)">{{ t("certd.localCa.acmeUsageExport") }}</a-button>
          </div>
        </template>
      </a-table-column>
    </a-table>
    <a-empty v-else :description="t('certd.localCa.acmeUsageNoAccount')" />
  </div>
</template>

<script setup lang="tsx">
import { onMounted, ref } from "vue";
import { notification } from "ant-design-vue";
import { dict } from "@fast-crud/fast-crud";
import { nanoid } from "nanoid";
import dayjs from "dayjs";
import { useRouter } from "vue-router";
import { useI18n } from "/src/locales";
import { request } from "/src/api/service";
import { useModal } from "/@/use/use-modal";
import { useFormDialog } from "/@/use/use-dialog";
import { createAccessApi } from "/@/views/certd/access/api";
import CertView from "/@/views/certd/pipeline/cert-view.vue";
import { localCaApi } from "../api";

defineOptions({ name: "LocalCaAcmeUsage" });

const { t } = useI18n();
const router = useRouter();
const model = useModal();
const { openFormDialog } = useFormDialog();
const accessApi = createAccessApi("user");

const eabs = ref<any[]>([]);
const accounts = ref<any[]>([]);
const accountAccesses = ref<any[]>([]);
const loading = ref(false);

function formatTime(value: any) {
  if (!value) {
    return "-";
  }
  return dayjs(Number(value) || value).format("YYYY-MM-DD HH:mm:ss");
}
function emailText(record: any) {
  const list = Array.isArray(record.contact) ? record.contact : [];
  const emails = list.map((item: string) => String(item).replace(/^mailto:/i, "")).filter(Boolean);
  return emails.length ? emails.join(", ") : "-";
}
function domainsText(record: any) {
  try {
    const arr = typeof record.allowedDomains === "string" ? JSON.parse(record.allowedDomains) : record.allowedDomains;
    return Array.isArray(arr) && arr.length ? arr.join(", ") : t("certd.localCa.eabInheritCa");
  } catch {
    return t("certd.localCa.eabInheritCa");
  }
}

async function load() {
  loading.value = true;
  try {
    eabs.value = (await localCaApi.ListMyEab()) || [];
    accounts.value = (await localCaApi.ListMyAccounts()) || [];
    try {
      const res: any = await accessApi.GetList({ query: { type: "acmeAccount" }, page: { current: 1, size: 100 } });
      accountAccesses.value = res?.records || [];
    } catch {
      accountAccesses.value = [];
    }
  } catch (e: any) {
    notification.error({ message: String(e?.message || e) });
  } finally {
    loading.value = false;
  }
}

function viewSecret(row: any) {
  // HMAC Key 不对用户暴露，仅展示掩码；注册账号时由后端按归属校验后内部使用
  model.success({
    title: `${t("certd.localCa.acmeUsageCopySecret")} - ${row.name}`,
    maskClosable: true,
    okText: t("certd.common.close"),
    width: 640,
    zIndex: 1200,
    content: () => (
      <a-descriptions bordered column={1} size="small">
        <a-descriptions-item label="KID">
          <fs-copyable modelValue={row.kid} />
        </a-descriptions-item>
        <a-descriptions-item label="HMAC Key">
          <span>••••••••••••••••</span>
        </a-descriptions-item>
        <a-descriptions-item label=" ">
          <span style={{ color: "#999" }}>{t("certd.localCa.acmeUsageSecretHidden")}</span>
        </a-descriptions-item>
      </a-descriptions>
    ),
  });
}

function viewEab(row: any) {
  const eab = eabs.value.find(item => item.id === row.eabId);
  if (!eab) {
    notification.warning({ message: t("certd.localCa.eabNotFound") });
    return;
  }
  model.success({
    title: `${t("certd.localCa.eabViewTitle")} - ${eab.name}`,
    maskClosable: true,
    okText: t("certd.common.close"),
    width: 640,
    zIndex: 1200,
    content: () => (
      <a-descriptions bordered column={1} size="small">
        <a-descriptions-item label="KID">{eab.kid}</a-descriptions-item>
        <a-descriptions-item label={t("certd.localCa.eabCa")}>{eab.caName || `#${eab.caId}`}</a-descriptions-item>
        <a-descriptions-item label={t("certd.localCa.eabType")}>{eab.privileged ? t("certd.localCa.eabTypePrivileged") : t("certd.localCa.eabTypeNormal")}</a-descriptions-item>
        <a-descriptions-item label={t("certd.localCa.eabAllowedDomains")}>{domainsText(eab)}</a-descriptions-item>
        <a-descriptions-item label={t("certd.localCa.eabUses")}>{`${eab.usedCount || 0} / ${eab.maxUses || "∞"}`}</a-descriptions-item>
        <a-descriptions-item label={t("certd.localCa.eabExpires")}>{formatTime(eab.expiresTime)}</a-descriptions-item>
      </a-descriptions>
    ),
  });
}

async function viewOrders(row: any) {
  let orders: any[] = [];
  try {
    orders = (await localCaApi.ListMyAccountOrders(row.id)) || [];
  } catch (e: any) {
    notification.error({ message: String(e?.message || e) });
    return;
  }
  const orderStatus = (status: string) => {
    const map: Record<string, string> = {
      pending: t("certd.localCa.orderStatusPending"),
      ready: t("certd.localCa.orderStatusReady"),
      processing: t("certd.localCa.orderStatusProcessing"),
      valid: t("certd.localCa.orderStatusValid"),
      invalid: t("certd.localCa.orderStatusInvalid"),
    };
    return map[status] || status;
  };
  const orderColor = (status: string) => {
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
  };
  const renderStatus = (order: any) => <a-tag color={orderColor(order.status)}>{orderStatus(order.status)}</a-tag>;
  const renderDomains = (order: any) => (order.identifiers || []).map((item: any) => item.value).join(", ");
  const renderDirect = (order: any) => {
    const color = order.directIssue ? "green" : "default";
    const text = order.directIssue ? t("certd.localCa.orderDirectIssueYes") : t("certd.localCa.orderDirectIssueNo");
    return <a-tag color={color}>{text}</a-tag>;
  };
  const renderTime = (order: any) => <span style={{ whiteSpace: "nowrap" }}>{formatTime(order.createTime)}</span>;
  const renderActions = (order: any) => {
    if (!order.certPem) {
      return <span>-</span>;
    }
    return (
      <a-button type="link" size="small" onClick={() => viewOrderCert(order)}>
        {t("certd.localCa.viewCertInfo")}
      </a-button>
    );
  };
  model.success({
    title: `${t("certd.localCa.acmeOrdersTitle")} - ${row.id}`,
    maskClosable: true,
    okText: t("certd.common.close"),
    width: 1000,
    zIndex: 1200,
    content: () => (
      <a-table dataSource={orders} pagination={{ pageSize: 10 }} size="small" rowKey="id">
        <a-table-column title={t("certd.localCa.acmeOrderStatus")} width={110}>
          {{ default: ({ record: order }: any) => renderStatus(order) }}
        </a-table-column>
        <a-table-column title={t("certd.localCa.certDomain")} width={220}>
          {{ default: ({ record: order }: any) => renderDomains(order) }}
        </a-table-column>
        <a-table-column title={t("certd.localCa.certSerial")} dataIndex="serialNumber" width={240} />
        <a-table-column title={t("certd.localCa.eabOrderType")} width={100} align="center">
          {{ default: ({ record: order }: any) => renderDirect(order) }}
        </a-table-column>
        <a-table-column title={t("certd.common.createTime")} width={180}>
          {{ default: ({ record: order }: any) => renderTime(order) }}
        </a-table-column>
        <a-table-column title={t("certd.localCa.certActions")} width={120} align="center">
          {{ default: ({ record: order }: any) => renderActions(order) }}
        </a-table-column>
      </a-table>
    ),
  });
}

async function viewOrderCert(order: any) {
  if (!order.certPem) {
    return;
  }
  const res = await localCaApi.GetCertDetail(order.certPem);
  model.success({
    title: t("certd.localCa.viewTitle"),
    maskClosable: true,
    okText: t("certd.common.confirm"),
    width: 800,
    zIndex: 1300,
    content: () => <CertView cert={{ crt: order.certPem, key: "", ic: "", detail: res.detail }} />,
  });
}

async function exportAccount(row: any) {
  let data: any;
  try {
    data = await localCaApi.ExportMyAccount(row.id);
  } catch (e: any) {
    notification.error({ message: String(e?.message || e) });
    return;
  }
  model.success({
    title: `${t("certd.localCa.acmeUsageExport")} - ${row.id}`,
    maskClosable: true,
    okText: t("certd.common.close"),
    width: 720,
    zIndex: 1200,
    content: () => (
      <a-descriptions bordered column={1} size="small">
        <a-descriptions-item label="Directory URL">
          <fs-copyable modelValue={data.directoryUrl} />
        </a-descriptions-item>
        <a-descriptions-item label="Account URI">
          <fs-copyable modelValue={data.accountUri} />
        </a-descriptions-item>
        <a-descriptions-item label="Account Key">
          <fs-copyable modelValue={data.accountKey} />
        </a-descriptions-item>
        <a-descriptions-item label={t("certd.localCa.acmeUsageEmail")}>{data.email || "-"}</a-descriptions-item>
        {data.eab ? (
          <a-descriptions-item label="EAB KID">
            <fs-copyable modelValue={data.eab.kid} />
          </a-descriptions-item>
        ) : null}
        {data.eab ? (
          <a-descriptions-item label="EAB HMAC Key">
            <fs-copyable modelValue={data.eab.hmacKey} />
          </a-descriptions-item>
        ) : null}
      </a-descriptions>
    ),
  });
}

async function openCreateAccount(row: any) {
  if (!row.sslProvider) {
    notification.warning({ message: t("certd.localCa.acmeUsageNoProvider") });
    return;
  }
  await openFormDialog({
    title: `${t("certd.localCa.acmeUsageCreateAccount")} - ${row.name}`,
    wrapper: { width: 560 },
    zIndex: 1200,
    initialForm: { email: "" },
    columns: {
      email: {
        title: t("certd.localCa.acmeUsageEmail"),
        type: "text",
        form: { required: true, col: { span: 24 }, rules: [{ required: true, message: t("certd.common.required") }], helper: t("certd.localCa.acmeUsageEmailHelper") },
      },
    },
    async onSubmit(form: any) {
      // 密钥由服务端内部使用，前端仅传eabId与邮箱，HMAC不下发
      await localCaApi.CreateAccountFromEab(row.id, form.email, `${row.name}账号`);
      notification.success({ message: t("certd.localCa.acmeUsageAccountCreated") });
      await load();
    },
  });
}

async function openCreatePipeline() {
  if (!accountAccesses.value.length) {
    notification.warning({ message: t("certd.localCa.acmeUsageNoAccountAccess") });
    return;
  }
  const accessOptions = accountAccesses.value.map(item => ({ label: item.name || `#${item.id}`, value: item.id }));
  await openFormDialog({
    title: t("certd.localCa.acmeUsageCreatePipeline"),
    wrapper: { width: 600 },
    zIndex: 1200,
    initialForm: { accessId: accessOptions[0]?.value, domains: "" },
    columns: {
      accessId: {
        title: t("certd.localCa.acmeUsageAccountAccess"),
        type: "dict-select",
        dict: dict({ data: accessOptions }),
        form: { required: true, col: { span: 24 } },
      },
      domains: {
        title: t("certd.localCa.certDomain"),
        type: "textarea",
        form: { required: true, col: { span: 24 }, component: { rows: 3, placeholder: "app.example.com" }, rules: [{ required: true, message: t("certd.common.required") }] },
      },
    },
    async onSubmit(form: any) {
      const access: any = await accessApi.GetObj(form.accessId);
      let setting: any = access?.setting;
      if (typeof setting === "string") {
        setting = JSON.parse(setting);
      }
      const sslProvider = setting?.caType;
      if (!sslProvider) {
        throw new Error(t("certd.localCa.acmeUsageNoProvider"));
      }
      const domains = String(form.domains || "")
        .split(/[\n,，\s]+/)
        .map(s => s.trim())
        .filter(Boolean);
      // 与标准创建器一致：补全 runnable id 与 triggers/notifications，否则编辑态插件上下文丢失
      const pipeline = {
        title: `${domains[0]}证书自动化（本地CA）`,
        runnableType: "pipeline",
        stages: [
          {
            id: nanoid(),
            title: "证书申请阶段",
            maxTaskCount: 1,
            runnableType: "stage",
            tasks: [
              {
                id: nanoid(),
                title: "证书申请任务",
                runnableType: "task",
                steps: [
                  {
                    id: nanoid(),
                    title: "申请证书",
                    runnableType: "step",
                    type: "CertApplyLocalCa",
                    input: { mode: "local-acme", sslProvider, caType: sslProvider, acmeAccountAccessId: form.accessId, domains, keyType: "rsa2048", validityDays: 365, renewDays: 30 },
                    strategy: { runStrategy: 0 },
                  },
                ],
              },
            ],
          },
        ],
        triggers: [],
        notifications: [],
      };
      const res: any = await request({ url: "/pi/pipeline/save", method: "post", data: { title: pipeline.title, content: JSON.stringify(pipeline), type: "cert" } });
      const id = res?.id || res;
      notification.success({ message: t("certd.localCa.acmeUsagePipelineCreated") });
      router.push({ path: "/cert/pipeline/detail", query: { id, editMode: "true" } });
    },
  });
}

onMounted(load);
defineExpose({ load });
</script>

<style lang="less">
.local-ca-acme-usage {
  flex: 1;
  min-height: 0;
  overflow: auto;

  .acme-usage-toolbar {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }
  .acme-usage-section {
    margin: 16px 0 8px;
    font-weight: 600;
  }
}
</style>
