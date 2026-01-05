import crypto, { BinaryToTextEncoding } from "crypto";

function md5(data: string, digest: BinaryToTextEncoding = "hex") {
  return crypto.createHash("md5").update(data).digest(digest);
}
function sha256(data: string, digest: BinaryToTextEncoding = "hex") {
  return crypto.createHash("sha256").update(data).digest(digest);
}

function hmacSha256(data: string, digest: BinaryToTextEncoding = "base64") {
  return crypto.createHmac("sha256", data).update(Buffer.alloc(0)).digest(digest);
}

function hmacSha256WithKey(key: string, data: string, digest: BinaryToTextEncoding = "base64") {
  return crypto.createHmac("sha256", key).update(data).digest(digest);
}

function base64(data: string) {
  return Buffer.from(data).toString("base64");
}
function base64Decode(data: string) {
  return Buffer.from(data, "base64").toString("utf8");
}

function toHex(data: number | string) {
  if (typeof data === "number") {
    return data.toString(16);
  }
  return Buffer.from(data).toString("hex");
}
function hexToStr(data: string) {
  return Buffer.from(data, "hex").toString("utf8");
}
function hexToNumber(data: string) {
  return parseInt(data, 16);
}
export const hashUtils = {
  md5,
  sha256,
  base64,
  base64Decode,
  hmacSha256,
  toHex,
  hexToStr,
  hexToNumber,
  hmacSha256WithKey,
};
