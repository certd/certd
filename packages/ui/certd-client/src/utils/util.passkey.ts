/** 浏览器/用户取消 WebAuthn 操作时统一识别，避免当作真实错误提示。 */
export function isPasskeyCancelledError(e: any) {
  const name = e?.name || "";
  const message = String(e?.message || "");
  return name === "NotAllowedError" || name === "AbortError" || /timed out or was not allowed|cancelled|canceled/i.test(message);
}
