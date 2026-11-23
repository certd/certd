import { createPrivateKey } from "node:crypto";

const EC_CURVES: Record<string, string[]> = {
  "256": ["prime256v1", "P-256", "secp256r1"],
  "384": ["secp384r1", "P-384"],
  "521": ["secp521r1", "P-521"],
};

export function normalizePrivateKeyPem(keyPem: string) {
  return createPrivateKey(keyPem).export({ type: "pkcs8", format: "pem" }).toString();
}

export function isPrivateKeyCompatible(keyPem: string, privateKeyType?: string) {
  const matched = String(privateKeyType || "").match(/^(rsa|ec)_(\d+)/i);
  if (!matched) {
    return false;
  }
  try {
    const key = createPrivateKey(keyPem);
    const type = matched[1].toLowerCase();
    const size = matched[2];
    if (type === "rsa") {
      return key.asymmetricKeyType === "rsa" && Number(key.asymmetricKeyDetails?.modulusLength) === Number(size);
    }
    const expectedCurves = EC_CURVES[size] || [];
    return key.asymmetricKeyType === "ec" && expectedCurves.includes(String(key.asymmetricKeyDetails?.namedCurve || ""));
  } catch (e) {
    return false;
  }
}
