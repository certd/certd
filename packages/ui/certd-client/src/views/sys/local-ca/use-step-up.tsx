import { Modal, notification } from "ant-design-vue";
import { useI18n } from "/src/locales";
import { createAccessApi } from "/@/views/certd/access/api";

function base64UrlToUint8Array(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

/**
 * 高危操作二次验证（TOTP 动态码 / Passkey），本地CA各页签共享。
 * 验证通过后执行 action 并签发 secret_access token；取消返回 false，不替换原表单对话框。
 */
export function useStepUp() {
  const { t } = useI18n();
  const secretAccessApi = createAccessApi("user");
  const passkeySupported = typeof window !== "undefined" && "PublicKeyCredential" in window && "credentials" in navigator;
  let passkeyAbort: AbortController | null = null;

  function translatePasskeyError(e: any): string {
    const name = e?.name || "";
    const msg = String(e?.message || "");
    if (name === "AbortError") {
      return t("certd.localCa.passkeyCancelled");
    }
    if (name === "NotAllowedError" || /timed out or was not allowed/i.test(msg)) {
      return t("certd.localCa.passkeyNotAllowed");
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
      const modalRef: { value: any } = { value: null };
      const code = { value: "" };
      const finish = (ok: boolean) => {
        if (settled) {
          return;
        }
        settled = true;
        passkeyAbort?.abort();
        modalRef.value?.destroy();
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
          throw new Error(translatePasskeyError(e));
        }
        if (!credential) {
          throw new Error(t("certd.localCa.passkeyCancelled"));
        }
        await secretAccessApi.VerifyPasskeySecretAccess(credential, options.challenge);
        await runAction();
      };
      modalRef.value = Modal.confirm({
        title,
        icon: null,
        width: 440,
        zIndex: 2000,
        okText: t("certd.localCa.verifyAndContinue"),
        cancelText: t("certd.common.cancel"),
        content: () => (
          <div>
            <a-alert type="warning" show-icon message={warning} class="mb-4" />
            <div class="mb-2">{t("certd.localCa.dynamicCode")}</div>
            <a-input
              size="large"
              placeholder={t("certd.localCa.dynamicCodePlaceholder")}
              onChange={(e: any) => {
                code.value = e?.target?.value || "";
              }}
            />
            {passkeySupported ? (
              <div class="mt-3 text-center">
                <a-button
                  type="link"
                  onClick={async () => {
                    try {
                      await verifyPasskey();
                    } catch (e: any) {
                      notification.error({ message: e?.message || t("certd.localCa.passkeyFailed") });
                    }
                  }}
                >
                  {t("certd.localCa.passkeyVerify")}
                </a-button>
              </div>
            ) : null}
          </div>
        ),
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

  return { openStepUp };
}
