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
  if (alg.startsWith("RS")) {
    const hash = alg === "RS256" ? "sha256" : alg === "RS384" ? "sha384" : alg === "RS512" ? "sha512" : null;
    if (!hash) {
      throw new AcmeProblem("badSignatureAlgorithm", `不支持签名算法：${alg}`);
    }
    return crypto.verify(hash, jws.signingInput, { key, padding: crypto.constants.RSA_PKCS1_PADDING }, jws.signature);
  }
  if (alg.startsWith("ES")) {
    const hash = alg === "ES256" ? "sha256" : alg === "ES384" ? "sha384" : alg === "ES512" ? "sha512" : null;
    if (!hash) {
      throw new AcmeProblem("badSignatureAlgorithm", `不支持签名算法：${alg}`);
    }
    return crypto.verify(hash, jws.signingInput, { key, dsaEncoding: "ieee-p1363" }, jws.signature);
  }
  throw new AcmeProblem("badSignatureAlgorithm", `暂不支持签名算法：${alg}`);
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
