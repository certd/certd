import { dict } from "@fast-crud/fast-crud";
import { notification } from "ant-design-vue";
import { ref } from "vue";
import { useFormDialog } from "/@/use/use-dialog";
import { useModal } from "/@/use/use-modal";
import { useI18n } from "/src/locales";
import { createAccessApi, getSecretAccessToken } from "/@/views/certd/access/api";
import LocalCaIssuedCerts from "./issued-certs.vue";
import LocalCaAcmeAccounts from "./acme-accounts.vue";
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
        });
        notification.success({ message: t("certd.localCa.generateSuccess") });
        await crudExpose.doRefresh();
      },
    });
  }

  async function openIntermediate(root: any) {
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
        maxValidityDays: root.maxValidityDays || 0,
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
        });
        notification.success({ message: t("certd.localCa.intermediateSuccess") });
        await crudExpose.doRefresh();
      },
    });
  }

  async function openCreateEab() {
    const allCas = await localCaApi.GetOptions();
    const caOptions = (allCas || []).filter((item: any) => item.caType === "intermediate" && item.acmeEnabled && !item.disabled).map((item: any) => ({ label: `${item.name} (${item.subjectCn})`, value: item.id }));
    if (caOptions.length === 0) {
      notification.error({ message: t("certd.localCa.eabNoCa") });
      return;
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
        const res = await localCaApi.CreateEab({
          caId: form.caId,
          name: form.name,
          maxUses: form.maxUses || 0,
          expiresDays: form.expiresDays || 0,
          allowedDomains: parseAllowedDomains(form.allowedDomains),
        });
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
      },
    });
  }

  async function openImport() {
    const allCas = await localCaApi.GetOptions();
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
        });
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
    const blob = new Blob([res.content], { type: "application/x-pem-file" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = res.filename;
    link.click();
    URL.revokeObjectURL(url);
    notification.success({ message: t("certd.localCa.exportSuccess") });
  }

  async function handlePasskeyVerify(row: any) {
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
      await downloadExport(row);
      verifyDialogRef.value?.close?.();
    } catch (e: any) {
      notification.error({ message: e.message || t("certd.localCa.passkeyFailed") });
    } finally {
      passkeyLoading.value = false;
    }
  }

  async function openExport(row: any) {
    if (secretAccessApi.HasSecretAccess()) {
      await downloadExport(row);
      return;
    }
    verifyDialogRef.value = await openFormDialog({
      title: t("certd.localCa.exportTitle"),
      wrapper: {
        width: 440,
        slots: {
          "form-body-bottom": () => {
            if (!passkeySupported) {
              return null;
            }
            return (
              <div class="mt-2 text-center">
                <a-button type="link" loading={passkeyLoading.value} onClick={() => handlePasskeyVerify(row)}>
                  {t("certd.localCa.passkeyVerify")}
                </a-button>
              </div>
            );
          },
        },
      },
      body: () => <a-alert type="warning" show-icon message={t("certd.localCa.exportWarning")} class="mb-4" />,
      initialForm: { verifyCode: "" },
      columns: {
        verifyCode: {
          title: t("certd.localCa.dynamicCode"),
          type: "text",
          form: {
            component: { placeholder: t("certd.localCa.dynamicCodePlaceholder") },
            rules: [{ required: true, message: t("certd.localCa.dynamicCodeRequired") }],
            col: { span: 24 },
          },
        },
      },
      async onSubmit(form: any) {
        await secretAccessApi.VerifySecretAccess(form.verifyCode);
        await downloadExport(row);
      },
    });
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

  async function openIssuedCerts(row: any) {
    model.success({
      title: `${t("certd.localCa.issuedCertsTitle")} - ${row.name}`,
      maskClosable: true,
      okText: t("certd.common.confirm"),
      width: 1000,
      content: () => <LocalCaIssuedCerts caId={row.id} />,
    });
  }

  return {
    openGenerate,
    openIntermediate,
    openCreateEab,
    openImport,
    openView,
    openExport,
    openIssuedCerts,
    openAcmeAccounts,
  };
}
