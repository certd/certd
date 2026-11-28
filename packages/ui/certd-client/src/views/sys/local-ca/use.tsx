import { dict } from "@fast-crud/fast-crud";
import { Modal, notification } from "ant-design-vue";
import { useFormDialog } from "/@/use/use-dialog";
import { useModal } from "/@/use/use-modal";
import { useI18n } from "/src/locales";
import { request } from "/@/api/service";
import { getSecretAccessToken } from "/@/views/certd/access/api";
import { useProjectStore } from "/@/store/project";
import LocalCaArchivedRoots from "./archived-roots.vue";
import LocalCaLeakRevoke from "./components/leak-revoke.vue";
import { localCaApi } from "./api";
import { useStepUp } from "./use-step-up";

function formatDomainsText(value: any) {
  if (!value) {
    return "";
  }
  try {
    const arr = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(arr) ? arr.join("\n") : "";
  } catch {
    return "";
  }
}

function parseAllowedDomains(text: string) {
  return String(text || "")
    .split(/[,，\s]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

export function useLocalCaDialogs(crudExpose: any, caViewRef?: any) {
  const { t } = useI18n();
  const { openFormDialog } = useFormDialog();
  const model = useModal();
  const { openStepUp } = useStepUp();

  async function openGenerate() {
    await openFormDialog({
      title: t("certd.localCa.generateTitle"),
      wrapper: { width: 680 },
      body: () => <a-alert type="warning" show-icon message={t("certd.localCa.generateWarning")} description={t("certd.localCa.generateWarningDesc")} class="mb-4" />,
      initialForm: {
        exportDisabled: false,
        keyType: "rsa2048",
        validityYears: 10,
        usage: "server",
        maxValidityDays: 0,
      },
      columns: {
        name: {
          title: t("certd.localCa.fields.name"),
          type: "text",
          form: {
            required: true,
            rules: [{ required: true, message: t("certd.common.required") }],
            col: { span: 24 },
          },
        },
        subjectCn: {
          title: t("certd.localCa.fields.subjectCn"),
          type: "text",
          form: {
            required: true,
            rules: [{ required: true, message: t("certd.common.required") }],
            col: { span: 24 },
          },
        },
        subjectO: {
          title: t("certd.localCa.fields.organization"),
          type: "text",
          form: { col: { span: 12 } },
        },
        subjectOU: {
          title: t("certd.localCa.fields.organizationUnit"),
          type: "text",
          form: { col: { span: 12 } },
        },
        subjectC: {
          title: t("certd.localCa.fields.country"),
          type: "text",
          form: { col: { span: 12 }, component: { maxlength: 2 } },
        },
        subjectST: {
          title: t("certd.localCa.fields.state"),
          type: "text",
          form: { col: { span: 12 } },
        },
        subjectL: {
          title: t("certd.localCa.fields.locality"),
          type: "text",
          form: { col: { span: 12 } },
        },
        keyType: {
          title: t("certd.localCa.fields.keyType"),
          type: "dict-select",
          dict: dict({
            data: [
              { label: "RSA 2048", value: "rsa2048" },
              { label: "RSA 3072", value: "rsa3072" },
              { label: "RSA 4096", value: "rsa4096" },
              { label: "ECDSA P-256", value: "ecdsa256" },
              { label: "ECDSA P-384", value: "ecdsa384" },
            ],
          }),
          form: { required: true, col: { span: 12 } },
        },
        validityYears: {
          title: t("certd.localCa.fields.validityYears"),
          type: "number",
          form: { required: true, col: { span: 12 }, component: { min: 1, max: 20 } },
        },
        usage: {
          title: t("certd.localCa.fields.usage"),
          type: "dict-select",
          dict: dict({
            data: [
              { label: t("certd.localCa.usage.server"), value: "server" },
              { label: t("certd.localCa.usage.client"), value: "client" },
              { label: t("certd.localCa.usage.both"), value: "both" },
            ],
          }),
          form: { required: true, col: { span: 12 } },
        },
        maxValidityDays: {
          title: t("certd.localCa.fields.maxValidityDays"),
          type: "number",
          form: { col: { span: 12 }, component: { min: 0 } },
          helper: t("certd.localCa.fields.maxValidityDaysHelper"),
        },
        allowedDomains: {
          title: t("certd.localCa.fields.allowedDomains"),
          type: "textarea",
          form: {
            col: { span: 24 },
            component: { rows: 3, placeholder: "example.com\ninternal.example.com" },
            helper: t("certd.localCa.fields.allowedDomainsHelper"),
          },
        },
        baseUrl: {
          title: t("certd.localCa.fields.baseUrl"),
          type: "text",
          form: {
            col: { span: 24 },
            component: { placeholder: window.location.origin },
            helper: t("certd.localCa.fields.baseUrlHelper", { origin: window.location.origin }),
          },
        },
        dnsServer: {
          title: t("certd.localCa.fields.dnsServer"),
          type: "text",
          form: { col: { span: 24 }, component: { placeholder: "10.0.0.53:5353" }, helper: t("certd.localCa.fields.dnsServerHelper") },
        },
        exportDisabled: {
          title: t("certd.localCa.fields.exportDisabled"),
          type: "dict-switch",
          dict: dict({
            data: [
              { label: t("certd.localCa.exportDisabledYes"), value: true, color: "red" },
              { label: t("certd.localCa.exportDisabledNo"), value: false, color: "green" },
            ],
          }),
          form: {
            col: { span: 24 },
            helper: t("certd.localCa.fields.exportDisabledHelper"),
          },
        },
        remark: {
          title: t("certd.localCa.fields.remark"),
          type: "textarea",
          form: { col: { span: 24 }, component: { rows: 2 } },
        },
      },
      async onSubmit(form: any) {
        const doGenerate = async () => {
          try {
            await localCaApi.Generate({
              name: form.name,
              subject: {
                CN: form.subjectCn,
                O: form.subjectO,
                OU: form.subjectOU,
                C: form.subjectC,
                ST: form.subjectST,
                L: form.subjectL,
              },
              keyType: form.keyType,
              validityYears: form.validityYears,
              usage: form.usage,
              allowedDomains: parseAllowedDomains(form.allowedDomains),
              maxValidityDays: form.maxValidityDays || 0,
              baseUrl: form.baseUrl,
              remark: form.remark,
              exportDisabled: form.exportDisabled === true,
              dnsServer: form.dnsServer,
              verifyToken: getSecretAccessToken(),
            });
            notification.success({ message: t("certd.localCa.generateSuccess") });
            await crudExpose.doRefresh();
          } catch (e: any) {
            notification.error({ message: String(e?.message || e) });
            throw e;
          }
        };
        // 根CA生成属敏感操作：统一二次验证后提交（服务端强制校验新鲜令牌）
        const verified = await openStepUp(t("certd.localCa.generateStepUpTitle"), t("certd.localCa.generateStepUpDesc"), doGenerate);
        if (!verified) {
          return false;
        }
      },
    });
  }

  async function openIntermediate(root: any) {
    if (root?.caType !== "root") {
      notification.warning({ message: t("certd.localCa.onlyRootCanIssueIntermediate") });
      return;
    }
    await openFormDialog({
      title: t("certd.localCa.intermediateTitle"),
      wrapper: { width: 680 },
      body: () => <a-alert type="info" show-icon message={t("certd.localCa.intermediateWarning")} description={t("certd.localCa.intermediateWarningDesc")} class="mb-4" />,
      initialForm: {
        name: "",
        subjectCn: "",
        keyType: "rsa2048",
        validityYears: 5,
        exportDisabled: false,
        usage: root.usage || "server",
        maxValidityDays: root.maxValidityDays > 0 ? root.maxValidityDays : 365,
        allowedDomainsText: "",
        baseUrl: root.baseUrl || "",
      },
      columns: {
        name: {
          title: t("certd.localCa.fields.name"),
          type: "text",
          form: {
            required: true,
            rules: [{ required: true, message: t("certd.common.required") }],
            col: { span: 24 },
          },
        },
        subjectCn: {
          title: t("certd.localCa.fields.subjectCn"),
          type: "text",
          form: {
            required: true,
            rules: [{ required: true, message: t("certd.common.required") }],
            col: { span: 24 },
          },
        },
        subjectO: {
          title: t("certd.localCa.fields.organization"),
          type: "text",
          form: { col: { span: 12 } },
        },
        subjectOU: {
          title: t("certd.localCa.fields.organizationUnit"),
          type: "text",
          form: { col: { span: 12 } },
        },
        keyType: {
          title: t("certd.localCa.fields.keyType"),
          type: "dict-select",
          dict: dict({
            data: [
              { label: "RSA 2048", value: "rsa2048" },
              { label: "RSA 3072", value: "rsa3072" },
              { label: "RSA 4096", value: "rsa4096" },
              { label: "ECDSA P-256", value: "ecdsa256" },
              { label: "ECDSA P-384", value: "ecdsa384" },
            ],
          }),
          form: { required: true, col: { span: 12 } },
        },
        validityYears: {
          title: t("certd.localCa.fields.validityYears"),
          type: "number",
          form: { required: true, col: { span: 12 }, component: { min: 1, max: 10 } },
        },
        usage: {
          title: t("certd.localCa.fields.usage"),
          type: "dict-select",
          dict: dict({
            data: [
              { label: t("certd.localCa.usage.server"), value: "server" },
              { label: t("certd.localCa.usage.client"), value: "client" },
              { label: t("certd.localCa.usage.both"), value: "both" },
            ],
          }),
          form: { required: true, col: { span: 12 } },
        },
        maxValidityDays: {
          title: t("certd.localCa.fields.maxValidityDays"),
          type: "number",
          form: { col: { span: 12 }, component: { min: 0 } },
        },
        allowedDomainsText: {
          title: t("certd.localCa.fields.allowedDomains"),
          type: "textarea",
          form: {
            col: { span: 24 },
            component: { rows: 3, placeholder: "example.com\ninternal.example.com" },
            helper: t("certd.localCa.fields.allowedDomainsHelper"),
          },
        },
        baseUrl: {
          title: t("certd.localCa.fields.baseUrl"),
          type: "text",
          form: {
            col: { span: 24 },
            component: { placeholder: window.location.origin },
            helper: t("certd.localCa.fields.baseUrlHelper", { origin: window.location.origin }),
          },
        },
        dnsServer: {
          title: t("certd.localCa.fields.dnsServer"),
          type: "text",
          form: { col: { span: 24 }, component: { placeholder: "10.0.0.53:5353" }, helper: t("certd.localCa.fields.dnsServerHelper") },
        },
        exportDisabled: {
          title: t("certd.localCa.fields.exportDisabled"),
          type: "dict-switch",
          dict: dict({
            data: [
              { label: t("certd.localCa.exportDisabledYes"), value: true, color: "red" },
              { label: t("certd.localCa.exportDisabledNo"), value: false, color: "green" },
            ],
          }),
          form: {
            col: { span: 24 },
            helper: t("certd.localCa.fields.exportDisabledHelper"),
          },
        },
        remark: {
          title: t("certd.localCa.fields.remark"),
          type: "textarea",
          form: { col: { span: 24 }, component: { rows: 2 } },
        },
      },
      async onSubmit(form: any) {
        const verified = await openStepUp(t("certd.localCa.intermediateStepUpTitle"), t("certd.localCa.intermediateStepUpDesc", { name: root.name }), async () => {
          await localCaApi.CreateIntermediate({
            rootId: root.id,
            name: form.name,
            subject: {
              CN: form.subjectCn,
              O: form.subjectO,
              OU: form.subjectOU,
            },
            keyType: form.keyType,
            validityYears: form.validityYears,
            usage: form.usage,
            allowedDomains: parseAllowedDomains(form.allowedDomainsText),
            maxValidityDays: form.maxValidityDays || 0,
            baseUrl: form.baseUrl,
            remark: form.remark,
            exportDisabled: form.exportDisabled === true,
            dnsServer: form.dnsServer,
            verifyToken: getSecretAccessToken(),
          });
          notification.success({ message: t("certd.localCa.intermediateSuccess") });
          await crudExpose.doRefresh();
        });
        if (!verified) {
          return false;
        }
      },
    });
  }

  async function openCreateEab(onCreated?: () => void, initialCaId?: number) {
    if (!initialCaId) {
      notification.error({ message: t("certd.localCa.eabNoCa") });
      return;
    }
    // 默认跟随当前CA的ACME模式：本地ACME → 本地EAB；标准ACME → 标准EAB
    let defaultMode: "local" | "standard" = "standard";
    try {
      const access = await localCaApi.GetAcmeAccess(initialCaId);
      defaultMode = access?.acmeMode === "local" ? "local" : "standard";
    } catch {
      defaultMode = "standard";
    }
    await openFormDialog({
      title: t("certd.localCa.eabCreateTitle"),
      zIndex: 1200,
      wrapper: { width: 600 },
      body: () => <a-alert type="warning" show-icon message={t("certd.localCa.eabCreateWarning")} description={t("certd.localCa.eabCreateWarningDesc")} class="mb-4" />,
      initialForm: { mode: defaultMode, maxUses: 1, expiresDays: 3650, privileged: false },
      columns: {
        mode: {
          title: t("certd.localCa.eabMode"),
          type: "dict-select",
          dict: dict({
            data: [
              { label: t("certd.localCa.eabModeLocal"), value: "local" },
              { label: t("certd.localCa.eabModeStandard"), value: "standard" },
            ],
          }),
          form: { required: true, col: { span: 24 }, helper: t("certd.localCa.eabModeHelper") },
        },
        name: {
          title: t("certd.localCa.eabName"),
          type: "text",
          form: { required: true, col: { span: 24 }, rules: [{ required: true, message: t("certd.common.required") }] },
        },
        privileged: {
          title: t("certd.localCa.eabType"),
          type: "dict-select",
          dict: dict({
            data: [
              { label: t("certd.localCa.eabTypeNormal"), value: false, color: "default" },
              { label: t("certd.localCa.eabTypePrivileged"), value: true, color: "orange" },
            ],
          }),
          form: { col: { span: 24 }, helper: t("certd.localCa.eabPrivilegedHelper") },
        },
        allowedDomains: {
          title: t("certd.localCa.eabAllowedDomains"),
          type: "textarea",
          form: {
            col: { span: 24 },
            component: { rows: 3, placeholder: "team-a.example.com\n*.team-a.example.com" },
            helper: t("certd.localCa.eabAllowedDomainsHelper"),
          },
        },
        maxUses: {
          title: t("certd.localCa.eabMaxUses"),
          type: "number",
          form: { col: { span: 12 }, component: { min: 0 } },
          helper: t("certd.localCa.eabMaxUsesHelper"),
        },
        expiresDays: {
          title: t("certd.localCa.eabExpiresDays"),
          type: "number",
          form: { col: { span: 12 }, component: { min: 0 } },
          helper: t("certd.localCa.eabExpiresDaysHelper"),
        },
        remark: {
          title: t("certd.localCa.fields.remark"),
          type: "textarea",
          form: { col: { span: 24 }, component: { rows: 2 } },
        },
      },
      async onSubmit(form: any) {
        let res: any;
        const verified = await openStepUp(t("certd.localCa.eabStepUpTitle"), t("certd.localCa.eabStepUpDesc"), async () => {
          res = await localCaApi.CreateEab({
            caId: initialCaId,
            mode: form.mode === "standard" ? "standard" : "local",
            name: form.name,
            maxUses: form.maxUses || 0,
            expiresDays: form.expiresDays || 0,
            allowedDomains: parseAllowedDomains(form.allowedDomains),
            remark: form.remark,
            privileged: form.privileged === true,
          });
        });
        if (!verified) {
          return false;
        }
        if (form.mode === "local") {
          model.success({
            title: t("certd.localCa.eabCreatedTitle"),
            width: 620,
            zIndex: 1300,
            okText: t("certd.common.close"),
            content: () => (
              <div>
                <a-alert type="success" show-icon message={t("certd.localCa.eabLocalCreatedHint")} class="mb-4" />
                <a-descriptions bordered column={1} size="small">
                  <a-descriptions-item label="KID">
                    <fs-copyable modelValue={res.kid}>{res.kid}</fs-copyable>
                  </a-descriptions-item>
                </a-descriptions>
              </div>
            ),
          });
        } else {
          model.success({
            title: t("certd.localCa.eabCreatedTitle"),
            width: 620,
            zIndex: 1300,
            okText: t("certd.common.close"),
            content: () => (
              <div>
                <a-alert type="warning" show-icon message={t("certd.localCa.eabSecretOnce")} class="mb-4" />
                <a-descriptions bordered column={1} size="small">
                  <a-descriptions-item label="KID">
                    <fs-copyable modelValue={res.kid}>{res.kid}</fs-copyable>
                  </a-descriptions-item>
                  <a-descriptions-item label="HMAC Key">
                    <fs-copyable modelValue={res.hmacKey}>{res.hmacKey}</fs-copyable>
                  </a-descriptions-item>
                </a-descriptions>
              </div>
            ),
          });
        }
        onCreated?.();
      },
    });
  }

  async function openEditEab(row: any, onUpdated?: () => void) {
    if (!row?.id) {
      notification.warning({ message: t("certd.localCa.selectCaFirst") });
      return;
    }
    const remainingDays = row.expiresTime ? Math.max(0, Math.round((Number(row.expiresTime) - Date.now()) / 86400000)) : 0;
    await openFormDialog({
      title: t("certd.localCa.eabEditTitle"),
      zIndex: 1200,
      wrapper: { width: 600 },
      initialForm: {
        name: row.name,
        remark: row.remark || "",
        allowedDomains: formatDomainsText(row.allowedDomains),
        maxUses: row.maxUses || 0,
        expiresDays: remainingDays,
      },
      columns: {
        name: {
          title: t("certd.localCa.eabName"),
          type: "text",
          form: { required: true, col: { span: 24 }, rules: [{ required: true, message: t("certd.common.required") }] },
        },
        allowedDomains: {
          title: t("certd.localCa.eabAllowedDomains"),
          type: "textarea",
          form: { col: { span: 24 }, component: { rows: 3 }, helper: t("certd.localCa.eabAllowedDomainsHelper") },
        },
        maxUses: {
          title: t("certd.localCa.eabMaxUses"),
          type: "number",
          form: { col: { span: 12 }, component: { min: 0 }, helper: t("certd.localCa.eabMaxUsesHelper") },
        },
        expiresDays: {
          title: t("certd.localCa.eabExpiresDays"),
          type: "number",
          form: { col: { span: 12 }, component: { min: 0 }, helper: t("certd.localCa.eabExpiresDaysEditHelper") },
        },
        remark: {
          title: t("certd.localCa.fields.remark"),
          type: "textarea",
          form: { col: { span: 24 }, component: { rows: 2 } },
        },
      },
      async onSubmit(form: any) {
        const maxUses = Number(form.maxUses || 0);
        const usedCount = Number(row.usedCount || 0);
        if (maxUses > 0 && maxUses < usedCount) {
          notification.warning({ message: t("certd.localCa.eabMaxUsesTooLow", { used: usedCount }) });
          return false;
        }
        const verified = await openStepUp(t("certd.localCa.eabStepUpTitle"), t("certd.localCa.eabStepUpDesc"), async () => {
          await localCaApi.UpdateEab({
            caId: row.caId,
            eabId: row.id,
            name: form.name,
            remark: form.remark,
            allowedDomains: parseAllowedDomains(form.allowedDomains),
            maxUses: form.maxUses || 0,
            expiresDays: form.expiresDays || 0,
          });
        });
        if (!verified) {
          return false;
        }
        notification.success({ message: t("certd.localCa.eabUpdated") });
        onUpdated?.();
      },
    });
  }

  async function openImport() {
    const allCas = await localCaApi.GetAdminOptions();
    const rootOptions = (allCas || []).filter((item: any) => item.caType === "root" && !item.disabled).map((item: any) => ({ label: `${item.name} (${item.subjectCn})`, value: item.id }));
    await openFormDialog({
      title: t("certd.localCa.importTitle"),
      wrapper: { width: 720 },
      body: () => <a-alert type="warning" show-icon message={t("certd.localCa.importWarning")} description={t("certd.localCa.importWarningDesc")} class="mb-4" />,
      initialForm: { usage: "server", maxValidityDays: 0, exportDisabled: false },
      columns: {
        name: {
          title: t("certd.localCa.fields.name"),
          type: "text",
          form: {
            required: true,
            rules: [{ required: true, message: t("certd.common.required") }],
            col: { span: 24 },
          },
        },
        certPem: {
          title: t("certd.localCa.fields.certPem"),
          type: "textarea",
          form: {
            required: true,
            rules: [{ required: true, message: t("certd.common.required") }],
            col: { span: 24 },
            component: { rows: 6, placeholder: "-----BEGIN CERTIFICATE-----" },
          },
        },
        privateKeyPem: {
          title: t("certd.localCa.fields.privateKeyPem"),
          type: "textarea",
          form: {
            required: true,
            rules: [{ required: true, message: t("certd.common.required") }],
            col: { span: 24 },
            component: { rows: 6, placeholder: "-----BEGIN PRIVATE KEY-----" },
          },
        },
        parentId: {
          title: t("certd.localCa.fields.parentCa"),
          type: "dict-select",
          dict: dict({ data: rootOptions }),
          form: {
            required: false,
            col: { span: 24 },
            component: { allowClear: true, placeholder: t("certd.localCa.importParentPlaceholder") },
            helper: t("certd.localCa.importParentHelper"),
          },
        },
        usage: {
          title: t("certd.localCa.fields.usage"),
          type: "dict-select",
          dict: dict({
            data: [
              { label: t("certd.localCa.usage.server"), value: "server" },
              { label: t("certd.localCa.usage.client"), value: "client" },
              { label: t("certd.localCa.usage.both"), value: "both" },
            ],
          }),
          form: { required: true, col: { span: 12 } },
        },
        maxValidityDays: {
          title: t("certd.localCa.fields.maxValidityDays"),
          type: "number",
          form: { col: { span: 12 }, component: { min: 0 } },
          helper: t("certd.localCa.fields.maxValidityDaysHelper"),
        },
        allowedDomains: {
          title: t("certd.localCa.fields.allowedDomains"),
          type: "textarea",
          form: {
            col: { span: 24 },
            component: { rows: 3 },
            helper: t("certd.localCa.fields.allowedDomainsHelper"),
          },
        },
        baseUrl: {
          title: t("certd.localCa.fields.baseUrl"),
          type: "text",
          form: {
            col: { span: 24 },
            component: { placeholder: window.location.origin },
            helper: t("certd.localCa.fields.baseUrlHelper", { origin: window.location.origin }),
          },
        },
        dnsServer: {
          title: t("certd.localCa.fields.dnsServer"),
          type: "text",
          form: { col: { span: 24 }, component: { placeholder: "10.0.0.53:5353" }, helper: t("certd.localCa.fields.dnsServerHelper") },
        },
        exportDisabled: {
          title: t("certd.localCa.fields.exportDisabled"),
          type: "dict-switch",
          dict: dict({
            data: [
              { label: t("certd.localCa.exportDisabledYes"), value: true, color: "red" },
              { label: t("certd.localCa.exportDisabledNo"), value: false, color: "green" },
            ],
          }),
          form: {
            col: { span: 24 },
            helper: t("certd.localCa.fields.exportDisabledHelper"),
          },
        },
        remark: {
          title: t("certd.localCa.fields.remark"),
          type: "textarea",
          form: { col: { span: 24 }, component: { rows: 2 } },
        },
      },
      async onSubmit(form: any) {
        const duplicate = await localCaApi.CheckImportDuplicate({ certPem: form.certPem, parentId: form.parentId });
        let allowDuplicate = false;
        let allowExternalCrl = false;
        if (duplicate?.missingCrl) {
          notification.error({ message: t("certd.localCa.crlMissing") });
          return;
        }
        if (duplicate?.mismatchCrl) {
          notification.error({ message: t("certd.localCa.crlMismatch") });
          return;
        }
        if (duplicate?.externalCrl) {
          const confirmed = await new Promise<boolean>(resolve => {
            Modal.confirm({
              title: t("certd.localCa.externalCrlTitle"),
              content: t("certd.localCa.externalCrlContent", { url: (duplicate.expectedCrlUrl || "").toString() }),
              okText: t("certd.localCa.externalCrlContinue"),
              okType: "danger",
              cancelText: t("certd.common.cancel"),
              onOk() {
                resolve(true);
              },
              onCancel() {
                resolve(false);
              },
            });
          });
          if (!confirmed) {
            return;
          }
          allowExternalCrl = true;
        }
        if (duplicate?.duplicated) {
          const confirmed = await new Promise<boolean>(resolve => {
            Modal.confirm({
              title: t("certd.localCa.duplicateImportTitle"),
              content: t("certd.localCa.duplicateImportContent", { name: duplicate.name }),
              okText: t("certd.localCa.duplicateImportContinue"),
              okType: "danger",
              cancelText: t("certd.common.cancel"),
              onOk() {
                resolve(true);
              },
              onCancel() {
                resolve(false);
              },
            });
          });
          if (!confirmed) {
            return;
          }
          allowDuplicate = true;
        }
        const verified = await openStepUp(t("certd.localCa.importStepUpTitle"), t("certd.localCa.importStepUpDesc"), async () => {
          await localCaApi.Import({
            name: form.name,
            parentId: form.parentId,
            certPem: form.certPem,
            privateKeyPem: form.privateKeyPem,
            usage: form.usage,
            allowedDomains: parseAllowedDomains(form.allowedDomains),
            maxValidityDays: form.maxValidityDays || 0,
            baseUrl: form.baseUrl,
            remark: form.remark,
            exportDisabled: form.exportDisabled === true,
            allowDuplicate,
            allowExternalCrl,
          });
        });
        if (!verified) {
          return false;
        }
        notification.success({ message: t("certd.localCa.importSuccess") });
        await crudExpose.doRefresh();
      },
    });
  }

  async function openView(row: any) {
    caViewRef?.value?.open(row);
  }

  async function downloadExport(row: any) {
    const res = await localCaApi.Export(row.id, getSecretAccessToken());
    notification.success({ message: t("certd.localCa.exportSaved", { path: res.path }), duration: 15 });
  }

  async function openExport(row: any) {
    await openStepUp(t("certd.localCa.exportTitle"), t("certd.localCa.exportWarning"), async () => {
      await downloadExport(row);
    });
  }

  async function openEnableCa(row: any) {
    await openStepUp(
      t("certd.localCa.enableCaStepUpTitle"),
      t("certd.localCa.enableCaStepUpDesc", { name: row.name }),
      async () => {
        await localCaApi.Disable(row.id, false, getSecretAccessToken());
        notification.success({ message: t("certd.localCa.enabledSuccess") });
        await crudExpose.doRefresh();
      },
      () => crudExpose.doRefresh()
    );
  }

  function openRotateIntermediate(row: any) {
    Modal.confirm({
      title: t("certd.localCa.rotateIntermediateTitle"),
      content: t("certd.localCa.rotateIntermediateDesc", { name: row.name }),
      okText: t("certd.localCa.rotateIntermediateOk"),
      cancelText: t("certd.common.cancel"),
      async onOk() {
        await openStepUp(t("certd.localCa.rotateIntermediateTitle"), t("certd.localCa.rotateIntermediateStepUp"), async () => {
          const res = await localCaApi.RotateIntermediate({ id: row.id });
          notification.success({ message: t("certd.localCa.rotateIntermediateSuccess", { id: res.id }) });
          await crudExpose.doRefresh();
        });
      },
    });
  }

  function openRevokeIntermediate(row: any) {
    if (row?.caType !== "intermediate") {
      notification.warning({ message: t("certd.localCa.onlyIntermediate") });
      return;
    }
    Modal.confirm({
      title: t("certd.localCa.revokeIntermediateTitle"),
      content: t("certd.localCa.revokeIntermediateDesc", { name: row.name }),
      okText: t("certd.localCa.revokeIntermediateOk"),
      okType: "danger",
      async onOk() {
        await openStepUp(t("certd.localCa.revokeIntermediateTitle"), t("certd.localCa.revokeIntermediateStepUp"), async () => {
          const res = await localCaApi.RevokeIntermediate(row.id, getSecretAccessToken());
          notification.success({ message: t("certd.localCa.revokeIntermediateSuccess", { serial: res.serialNumber, crlNumber: res.crlNumber }), duration: 10 });
          await crudExpose.doRefresh();
        });
      },
    });
  }

  function openArchiveCa(row: any) {
    if (!row.disabled) {
      notification.warning({ message: t("certd.localCa.archivePrecheckDisabled") });
      return;
    }
    if (row.caType === "intermediate" && !row.revoked && !row.rotatedToId) {
      notification.warning({ message: t("certd.localCa.archivePrecheckRevoked") });
      return;
    }
    Modal.confirm({
      title: t("certd.localCa.archiveCaTitle"),
      content: t("certd.localCa.archiveCaDesc", { name: row.name }),
      okText: t("certd.localCa.archiveCaOk"),
      okType: "danger",
      cancelText: t("certd.common.cancel"),
      async onOk() {
        await openStepUp(t("certd.localCa.archiveCaStepUpTitle"), t("certd.localCa.archiveCaDesc", { name: row.name }), async () => {
          try {
            await localCaApi.Archive(row.id);
          } catch (e: any) {
            if (/流水线.*引用/.test(String(e?.message || ""))) {
              const confirmed = await new Promise<boolean>(resolve => {
                Modal.confirm({
                  title: t("certd.localCa.forceArchiveTitle"),
                  content: t("certd.localCa.forceArchiveContent", { name: row.name }),
                  okText: t("certd.localCa.forceArchiveOk"),
                  okType: "danger",
                  cancelText: t("certd.common.cancel"),
                  onOk: () => resolve(true),
                  onCancel: () => resolve(false),
                });
              });
              if (!confirmed) {
                throw e;
              }
              // 一次性令牌已被首次归档消费，强制重试须重新验证
              await openStepUp(t("certd.localCa.archiveCaStepUpTitle"), t("certd.localCa.archiveCaDesc", { name: row.name }), async () => {
                await localCaApi.Archive(row.id, true, getSecretAccessToken());
              });
            } else {
              throw e;
            }
          }
          notification.success({ message: t("certd.localCa.archiveSuccess") });
          await crudExpose.doRefresh();
        });
      },
    });
  }

  async function openArchivedRoots() {
    model.success({
      title: t("certd.localCa.archivedRootsTitle"),
      maskClosable: true,
      okText: t("certd.common.close"),
      width: 1100,
      content: () => <LocalCaArchivedRoots runStepUp={(action: () => Promise<void>) => openStepUp(t("certd.localCa.archivedRootsTitle"), t("certd.localCa.archivedRootsRefreshStepUp"), action)} />,
    });
  }

  async function openLeakRevoke(row: any, onDone?: () => void) {
    model.success({
      title: `${t("certd.localCa.leakRevokeTitle")} - ${row.name}`,
      maskClosable: true,
      okText: t("certd.common.close"),
      width: 900,
      zIndex: 1200,
      content: () => (
        <LocalCaLeakRevoke caId={row.caId} eabId={row.id} runStepUp={(action: () => Promise<void>) => openStepUp(t("certd.localCa.leakRevokeTitle"), t("certd.localCa.leakRevokeStepUpDesc"), action)} onDone={onDone} />
      ),
    });
  }

  async function openAssignAccount(row: any, onDone?: () => void) {
    const projectStore = useProjectStore();
    const isEnterprise = projectStore.isEnterprise.value;
    let targetOptions: { label: string; value: number }[] = [];
    const userEmailMap = new Map<number, string>();
    if (isEnterprise) {
      try {
        const res: any = await request({ url: "/sys/enterprise/project/page", method: "post", data: { page: { current: 1, size: 1000 } }, showErrorNotify: false });
        targetOptions = (res?.records || []).filter((p: any) => !p.disabled).map((p: any) => ({ label: p.name, value: Number(p.id) }));
      } catch {
        targetOptions = [];
      }
      if (!targetOptions.length) {
        notification.error({ message: t("certd.localCa.eabAssignNoProjects") });
        return;
      }
    } else {
      try {
        const users: any[] = await request({ url: "/sys/authority/user/getSimpleUsers", method: "POST", showErrorNotify: false });
        targetOptions = (users || []).map(u => ({ label: u.nickName || u.username || `#${u.id}`, value: Number(u.id) }));
        for (const u of users || []) {
          userEmailMap.set(Number(u.id), String(u.email || "").trim());
        }
      } catch {
        targetOptions = [];
      }
      if (!targetOptions.length) {
        notification.error({ message: t("certd.localCa.eabAssignNoUsers") });
        return;
      }
    }
    await openFormDialog({
      title: t("certd.localCa.eabAssignTitle"),
      zIndex: 1200,
      wrapper: { width: 600 },
      body: () => (
        <div>
          <a-alert type="info" show-icon message={t("certd.localCa.eabAssignDesc")} class="mb-3" />
          {row.privileged ? <a-alert type="warning" show-icon message={t("certd.localCa.eabAssignPrivilegedWarning")} class="mb-3" /> : null}
        </div>
      ),
      initialForm: { targetId: undefined, email: "", name: "", ensureGrant: true },
      columns: {
        targetId: {
          title: isEnterprise ? t("certd.localCa.eabAssignProject") : t("certd.localCa.eabAssignUser"),
          type: "dict-select",
          dict: dict({ data: targetOptions }),
          form: {
            required: true,
            col: { span: 24 },
            // 切换用户时用其绑定邮箱填充（可手动修改）；无邮箱则清空。项目模式不改动
            valueChange({ form, value }: any) {
              if (isEnterprise) {
                return;
              }
              form.email = userEmailMap.get(Number(value ?? form.targetId)) || "";
            },
          },
        },
        email: {
          title: t("certd.localCa.eabAssignEmail"),
          type: "text",
          form: {
            required: true,
            col: { span: 24 },
            helper: t("certd.localCa.eabAssignEmailHelper"),
            rules: [{ type: "email", message: t("certd.localCa.eabAssignEmailInvalid") }],
          },
        },
        name: {
          title: t("certd.localCa.eabAssignName"),
          type: "text",
          form: { col: { span: 24 }, helper: t("certd.localCa.eabAssignNameHelper") },
        },
        ensureGrant: {
          title: t("certd.localCa.eabAssignEnsureGrant"),
          type: "dict-switch",
          dict: dict({
            data: [
              { label: t("common.enabled"), value: true },
              { label: t("common.disabled"), value: false },
            ],
          }),
          form: { col: { span: 24 }, helper: t("certd.localCa.eabAssignEnsureGrantHelper") },
        },
      },
      async onSubmit(form: any) {
        if (!form.targetId || !form.email) {
          notification.error({ message: t("certd.localCa.eabAssignSelectTarget") });
          return false;
        }
        let res: any;
        const verified = await openStepUp(t("certd.localCa.eabAssignStepUpTitle"), t("certd.localCa.eabAssignStepUpDesc"), async () => {
          res = await localCaApi.AssignEabAccount({
            eabId: row.id,
            targetType: isEnterprise ? "project" : "user",
            ...(isEnterprise ? { targetProjectId: Number(form.targetId) } : { targetUserId: Number(form.targetId) }),
            email: form.email,
            name: form.name,
            ensureGrant: form.ensureGrant !== false,
          });
        });
        if (!verified) {
          return false;
        }
        if (res?.alreadyAssigned) {
          notification.info({ message: t("certd.localCa.eabAssignAlready") });
        } else {
          notification.success({ message: t("certd.localCa.eabAssignSuccess") });
        }
        onDone?.();
      },
    });
  }

  return {
    openGenerate,
    openIntermediate,
    openCreateEab,
    openEditEab,
    openImport,
    openView,
    openExport,
    openRevokeIntermediate,
    openRotateIntermediate,
    openEnableCa,
    openArchiveCa,
    openStepUp,
    openArchivedRoots,
    openLeakRevoke,
    openAssignAccount,
  };
}
