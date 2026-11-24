import { dict } from "@fast-crud/fast-crud";
import { Alert, Button, Input, Modal, notification } from "ant-design-vue";
import { h, ref } from "vue";
import { useFormDialog } from "/@/use/use-dialog";
import { useModal } from "/@/use/use-modal";
import { useI18n } from "/src/locales";
import { createAccessApi, getSecretAccessToken } from "/@/views/certd/access/api";
import LocalCaIssuedCerts from "./issued-certs.vue";
import LocalCaAcmeAccounts from "./acme-accounts.vue";
import LocalCaEabManager from "./eab-manager.vue";
import LocalCaArchivedRoots from "./archived-roots.vue";
import { localCaApi } from "./api";

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
  const secretAccessApi = createAccessApi("user");
  const passkeySupported = typeof window !== "undefined" && "PublicKeyCredential" in window && "credentials" in navigator;
  const passkeyLoading = ref(false);
  const verifyDialogRef = ref<any>(null);
  let pendingStepUpAction: (() => Promise<void>) | null = null;

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
            required: true,
            rules: [{ required: true, message: t("certd.common.required") }],
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
        dnsServer: {
          title: t("certd.localCa.fields.dnsServer"),
          type: "text",
          form: { col: { span: 24 }, component: { placeholder: "10.0.0.53:5353" }, helper: t("certd.localCa.fields.dnsServerHelper") },
        },
        remark: {
          title: t("certd.localCa.fields.remark"),
          type: "textarea",
          form: { col: { span: 24 }, component: { rows: 2 } },
        },
      },
      async onSubmit(form: any) {
        const doGenerate = async () => {
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
        });
        notification.success({ message: t("certd.localCa.generateSuccess") });
        await crudExpose.doRefresh();
        };
        if (String(form.dnsServer || "").trim()) {
          await openStepUp(t("certd.localCa.dnsStepUpTitle"), t("certd.localCa.dnsStepUpDesc"), doGenerate);
        } else {
          await doGenerate();
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
        baseUrl: root.baseUrl || window.location.origin,
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
            required: true,
            rules: [{ required: true, message: t("certd.common.required") }],
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
          throw new Error(t("certd.localCa.stepUpCancelled"));
        }
      },
    });
  }

  async function openCreateEab(onCreated?: () => void) {
    const allCas = await localCaApi.GetAdminOptions();
    const caOptions = (allCas || []).filter((item: any) => item.caType === "intermediate" && item.acmeEnabled && !item.disabled).map((item: any) => ({ label: `${item.name} (${item.subjectCn})`, value: item.id }));
    if (caOptions.length === 0) {
      notification.error({ message: t("certd.localCa.eabNoCa") });
      return;
    }
    const grantOptions: any[] = [];
    for (const item of (allCas || []).filter((ca: any) => ca.caType === "intermediate" && ca.acmeEnabled && !ca.disabled)) {
      try {
        const grants = await localCaApi.ListGrants(item.id);
        for (const grant of grants || []) {
          grantOptions.push({
            label: `${item.name} - ${t("certd.localCa.grantUser")} #${grant.userId}${grant.projectId ? ` / ${t("certd.localCa.grantProject")} #${grant.projectId}` : ` / ${t("certd.localCa.allProjects")}`}`,
            value: grant.id,
          });
        }
      } catch (e) {
        // 操作员可能无权查看授权，跳过
      }
    }
    await openFormDialog({
      title: t("certd.localCa.eabCreateTitle"),
      wrapper: { width: 600 },
      body: () => <a-alert type="warning" show-icon message={t("certd.localCa.eabCreateWarning")} description={t("certd.localCa.eabCreateWarningDesc")} class="mb-4" />,
      initialForm: { maxUses: 1, expiresDays: 3650 },
      columns: {
        caId: {
          title: t("certd.localCa.eabCa"),
          type: "dict-select",
          dict: dict({ data: caOptions }),
          form: { required: true, col: { span: 24 } },
        },
        name: {
          title: t("certd.localCa.eabName"),
          type: "text",
          form: { required: true, col: { span: 24 }, rules: [{ required: true, message: t("certd.common.required") }] },
        },
        grantId: {
          title: t("certd.localCa.eabGrant"),
          type: "dict-select",
          dict: dict({ data: grantOptions }),
          form: {
            col: { span: 24 },
            component: { allowClear: true, placeholder: t("certd.localCa.eabGrantPlaceholder") },
            helper: grantOptions.length ? t("certd.localCa.eabGrantHelper") : t("certd.localCa.eabGrantEmpty"),
          },
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
      },
      async onSubmit(form: any) {
        let res: any;
        const verified = await openStepUp(t("certd.localCa.eabStepUpTitle"), t("certd.localCa.eabStepUpDesc"), async () => {
          res = await localCaApi.CreateEab({
            caId: form.caId,
            name: form.name,
            maxUses: form.maxUses || 0,
            expiresDays: form.expiresDays || 0,
            allowedDomains: parseAllowedDomains(form.allowedDomains),
            grantId: form.grantId || undefined,
          });
        });
        if (!verified) {
          return;
        }
        model.success({
          title: t("certd.localCa.eabCreatedTitle"),
          width: 620,
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
        onCreated?.();
      },
    });
  }

  async function openEabManager(row: any) {
    const managerRef: any = { value: null };
    model.success({
      title: `${t("certd.localCa.eabManagerTitle")} - ${row.name}`,
      maskClosable: true,
      okText: t("certd.common.close"),
      width: 1150,
      content: () => (
        <LocalCaEabManager
          ref={(el: any) => (managerRef.value = el)}
          caId={row.id}
          onCreate={() => openCreateEab(() => managerRef.value?.load?.())}
          runStepUp={(action: () => Promise<void>) => openStepUp(t("certd.localCa.eabStepUpTitle"), t("certd.localCa.eabStepUpDesc"), action)}
        />
      ),
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
            required: true,
            rules: [{ required: true, message: t("certd.common.required") }],
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
          return;
        }
        notification.success({ message: t("certd.localCa.importSuccess") });
        await crudExpose.doRefresh();
      },
    });
  }

  async function openView(row: any) {
    caViewRef?.value?.open(row);
  }

  function base64UrlToUint8Array(value: string) {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  }

  async function downloadExport(row: any) {
    const res = await localCaApi.Export(row.id, getSecretAccessToken());
    notification.success({ message: t("certd.localCa.exportSaved", { path: res.path }), duration: 15 });
  }

  async function handlePasskeyVerify() {
    if (!passkeySupported) {
      notification.error({ message: t("certd.localCa.passkeyNotSupported") });
      return;
    }
    passkeyLoading.value = true;
    try {
      const options = await secretAccessApi.GeneratePasskeyAuthentication();
      const credential = await (navigator.credentials as any).get({
        publicKey: {
          challenge: base64UrlToUint8Array(options.challenge),
          rpId: options.rpId,
          allowCredentials: (options.allowCredentials || []).map((item: any) => ({
            ...item,
            id: base64UrlToUint8Array(item.id),
          })),
          timeout: options.timeout || 60000,
          userVerification: "required",
        },
      });
      if (!credential) {
        throw new Error(t("certd.localCa.passkeyCancelled"));
      }
      await secretAccessApi.VerifyPasskeySecretAccess(credential, options.challenge);
      await pendingStepUpAction?.();
      verifyDialogRef.value?.close?.();
    } catch (e: any) {
      notification.error({ message: e.message || t("certd.localCa.passkeyFailed") });
    } finally {
      passkeyLoading.value = false;
    }
  }

  let passkeyAbort: AbortController | null = null;
  function translatePasskeyError(e: any, t: any): string {
    const name = e?.name || "";
    const msg = String(e?.message || "");
    if (name === "AbortError") {
      return t("certd.localCa.passkeyCancelled");
    }
    if (name === "NotAllowedError" || /timed out or was not allowed/i.test(msg)) {
      return t("certd.localCa.passkeyNotAllowed");
    }
    if (/already pending/i.test(msg)) {
      return t("certd.localCa.passkeyPending");
    }
    if (name === "InvalidStateError" || /already pending/i.test(msg)) {
      return t("certd.localCa.passkeyPending");
    }
    return msg || t("certd.localCa.passkeyFailed");
  }

  async function openStepUp(title: string, warning: string, action: () => Promise<void>, onClosed?: () => void, forceFresh = true): Promise<boolean> {
    if (!forceFresh && secretAccessApi.HasSecretAccess()) {
      await action();
      return true;
    }
    // 使用Ant Modal叠加弹窗，不替换原表单对话框，取消后可继续编辑原表单
    return await new Promise<boolean>(resolve => {
      let settled = false;
      let modal: any;
      const code = { value: "" };
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        passkeyAbort?.abort();
        modal?.destroy();
        onClosed?.();
        resolve(ok);
      };
      const runAction = async () => {
        await action();
        finish(true);
      };
      const verifyPasskey = async () => {
        const options = await secretAccessApi.GeneratePasskeyAuthentication();
        passkeyAbort?.abort();
        passkeyAbort = new AbortController();
        let credential: any;
        try {
          credential = await (navigator.credentials as any).get({
            publicKey: {
              challenge: base64UrlToUint8Array(options.challenge),
              rpId: options.rpId,
              allowCredentials: (options.allowCredentials || []).map((item: any) => ({ ...item, id: base64UrlToUint8Array(item.id) })),
              timeout: options.timeout || 60000,
              userVerification: "required",
            },
            signal: passkeyAbort.signal,
          });
        } catch (e: any) {
          throw new Error(translatePasskeyError(e, t));
        }
        if (!credential) {
          throw new Error(t("certd.localCa.passkeyCancelled"));
        }
        await secretAccessApi.VerifyPasskeySecretAccess(credential, options.challenge);
        await runAction();
      };
      modal = Modal.confirm({
        title,
        icon: null,
        width: 440,
        zIndex: 2000,
        okText: t("certd.localCa.verifyAndContinue"),
        cancelText: t("certd.common.cancel"),
        content: h("div", [
          h(Alert, { type: "warning", showIcon: true, message: warning, class: "mb-4" }),
          h("div", { class: "mb-2" }, t("certd.localCa.dynamicCode")),
          h(Input, {
            size: "large",
            placeholder: t("certd.localCa.dynamicCodePlaceholder"),
            onChange: (e: any) => {
              code.value = e?.target?.value || "";
            },
          }),
          passkeySupported
            ? h(
                "div",
                { class: "mt-3 text-center" },
                h(
                Button,
                {
                  type: "link",
                  onClick: async () => {
                    try {
                      await verifyPasskey();
                    } catch (e: any) {
                      notification.error({ message: e?.message || t("certd.localCa.passkeyFailed") });
                    }
                  },
                },
                () => t("certd.localCa.passkeyVerify")
                )
              )
            : null,
        ]),
        async onOk() {
          if (!code.value) {
            notification.warning({ message: t("certd.localCa.dynamicCodeRequired") });
            throw new Error(t("certd.localCa.dynamicCodeRequired"));
          }
          try {
            await secretAccessApi.VerifySecretAccess(code.value);
            await runAction();
          } catch (e: any) {
            notification.error({ message: e?.message || t("certd.localCa.passkeyFailed") });
            throw e;
          }
        },
        onCancel() {
          finish(false);
        },
      });
    });
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

  async function openAcmeAccounts(row: any) {
    model.success({
      title: `${t("certd.localCa.acmeAccountsTitle")} - ${row.name}`,
      maskClosable: true,
      okText: t("certd.common.close"),
      width: 1050,
      content: () => <LocalCaAcmeAccounts caId={row.id} />,
    });
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
              await localCaApi.Archive(row.id, true);
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


  async function openIssuedCerts(row: any) {
    model.success({
      title: `${t("certd.localCa.issuedCertsTitle")} - ${row.name}`,
      maskClosable: true,
      okText: t("certd.common.confirm"),
      width: 1000,
      content: () => <LocalCaIssuedCerts caId={row.id} runStepUp={(action: () => Promise<void>) => openStepUp(t("certd.localCa.revokeCertStepUpTitle"), t("certd.localCa.revokeCertStepUpDesc"), action)} />,
    });
  }

  return {
    openGenerate,
    openIntermediate,
    openCreateEab,
    openEabManager,
    openImport,
    openView,
    openExport,
    openIssuedCerts,
    openAcmeAccounts,
    openRevokeIntermediate,
    openRotateIntermediate,
    openEnableCa,
    openArchiveCa,
    openStepUp,
    openArchivedRoots,
  };
}
