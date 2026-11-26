import crypto, { KeyObject } from "node:crypto";

export type DecodedJws = {
  header: any;
  payloadRaw: string;
  payload: any;
  signingInput: Buffer;
  signature: Buffer;
};

export class AcmeProblem extends Error {
  status: number;
  type: string;

  constructor(type: string, detail: string, status = 400) {
    super(detail);
    this.type = type;
    this.status = status;
  }
}

export function decodeJws(body: any): DecodedJws {
  if (!body || typeof body !== "object") {
    throw new AcmeProblem("malformed", "请求体必须是JWS JSON");
  }
  const { protected: protectedHeader, payload, signature } = body;
  if (typeof protectedHeader !== "string" || typeof signature !== "string") {
    throw new AcmeProblem("malformed", "JWS缺少protected或signature");
  }
  let header: any;
  let payloadRaw = "";
  let parsedPayload: any = null;
  try {
    header = JSON.parse(base64urlDecode(protectedHeader).toString("utf8"));
  } catch (e: any) {
    throw new AcmeProblem("malformed", `JWS protected解析失败：${e.message}`);
  }
  if (typeof payload !== "string") {
    throw new AcmeProblem("malformed", "JWS payload必须是字符串");
  }
  payloadRaw = payload;
  if (payload) {
    try {
      parsedPayload = JSON.parse(base64urlDecode(payload).toString("utf8"));
    } catch (e: any) {
      throw new AcmeProblem("malformed", `JWS payload解析失败：${e.message}`);
    }
  }
  return {
    header,
    payloadRaw,
    payload: parsedPayload,
    signingInput: Buffer.from(`${protectedHeader}.${payloadRaw}`),
    signature: base64urlDecode(signature),
  };
}

// 账号公钥强度下限：RSA>=2048位；EC仅允许P-256/P-384，拒绝P-521等非常用曲线。
// ES512 无明确需求不开放（避免非标准/弱实现），OKP(EdDSA) 当前不支持，统一在此拒绝。
export const MIN_RSA_MODULUS_BITS = 2048;
const ALLOWED_EC_CURVES: Record<string, string> = {
  "P-256": "prime256v1",
  "P-384": "secp384r1",
};

/** 校验公钥类型与强度（RSA>=2048、EC仅P-256/P-384），供 sanitize 与验签共用。 */
export function assertJwkStrength(jwk: any, key: KeyObject) {
  if (key.asymmetricKeyType === "rsa") {
    const bits = Number(key.asymmetricKeyDetails?.modulusLength || 0);
    if (bits < MIN_RSA_MODULUS_BITS) {
      throw new AcmeProblem("badPublicKey", `RSA密钥长度不足${MIN_RSA_MODULUS_BITS}位`);
    }
    return;
  }
  if (key.asymmetricKeyType === "ec") {
    const curve = jwk?.crv;
    if (!curve || !ALLOWED_EC_CURVES[curve]) {
      throw new AcmeProblem("badPublicKey", "仅支持P-256/P-384椭圆曲线");
    }
    if (key.asymmetricKeyDetails?.namedCurve !== ALLOWED_EC_CURVES[curve]) {
      throw new AcmeProblem("badPublicKey", "JWK曲线参数不一致");
    }
    return;
  }
  throw new AcmeProblem("badPublicKey", `不支持的密钥类型：${jwk?.kty || key.asymmetricKeyType || "unknown"}`);
}

export function verifyJwsSignature(jws: DecodedJws, jwk: any) {
  const alg = jws.header?.alg;
  if (!alg || alg === "none") {
    throw new AcmeProblem("badSignatureAlgorithm", "JWS alg不合法");
  }
  let key: KeyObject;
  try {
    key = crypto.createPublicKey({ key: jwk, format: "jwk" });
  } catch (e: any) {
    throw new AcmeProblem("badPublicKey", `JWK解析失败：${e.message}`);
  }
  if (alg === "RS256" || alg === "RS384" || alg === "RS512") {
    if (key.asymmetricKeyType !== "rsa") {
      throw new AcmeProblem("badSignatureAlgorithm", `签名算法与密钥类型不匹配：${alg}`);
    }
    assertJwkStrength(jwk, key);
    const hash = alg === "RS256" ? "sha256" : alg === "RS384" ? "sha384" : "sha512";
    return crypto.verify(hash, jws.signingInput, { key, padding: crypto.constants.RSA_PKCS1_PADDING }, jws.signature);
  }
  if (alg === "ES256" || alg === "ES384") {
    // 强制 alg↔曲线对应：ES256=P-256、ES384=P-384，禁止用同一密钥跨算法/曲线降级
    const expectedCrv = alg === "ES256" ? "P-256" : "P-384";
    const expectedCurve = ALLOWED_EC_CURVES[expectedCrv];
    if (key.asymmetricKeyType !== "ec" || jwk?.crv !== expectedCrv || key.asymmetricKeyDetails?.namedCurve !== expectedCurve) {
      throw new AcmeProblem("badSignatureAlgorithm", `${alg}必须使用${expectedCrv}曲线`);
    }
    const hash = alg === "ES256" ? "sha256" : "sha384";
    return crypto.verify(hash, jws.signingInput, { key, dsaEncoding: "ieee-p1363" }, jws.signature);
  }
  throw new AcmeProblem("badSignatureAlgorithm", `不支持签名算法：${alg}`);
}

export function jwkThumbprint(jwk: any) {
  let members: any;
  if (jwk?.kty === "RSA") {
    members = { e: jwk.e, kty: "RSA", n: jwk.n };
  } else if (jwk?.kty === "EC") {
    members = { crv: jwk.crv, kty: "EC", x: jwk.x, y: jwk.y };
  } else if (jwk?.kty === "OKP") {
    members = { crv: jwk.crv, kty: "OKP", x: jwk.x };
  } else {
    throw new AcmeProblem("badPublicKey", `不支持的JWK类型：${jwk?.kty}`);
  }
  if (Object.values(members).some(value => typeof value !== "string" || !value)) {
    throw new AcmeProblem("badPublicKey", "JWK字段不完整");
  }
  return sha256Base64Url(JSON.stringify(members));
}

export function sha256Base64Url(value: string | Buffer) {
  return crypto.createHash("sha256").update(value).digest("base64url");
}

export function base64urlDecode(value: string) {
  return Buffer.from(value, "base64url");
}

export function base64urlEncode(value: Buffer | ArrayBuffer | string) {
  if (typeof value === "string") {
    return Buffer.from(value).toString("base64url");
  }
  return Buffer.from(value as any).toString("base64url");
}

export function randomId(size = 16) {
  return crypto.randomBytes(size).toString("base64url");
}
