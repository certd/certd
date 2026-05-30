import CryptoJS from "crypto-js";
import crypto from "crypto";
function rsaEncrypt(data: string, publicKey: string) {
  if (!data) {
    return data;
  }
  // const jsEncrypt = new JSEncrypt();
  // jsEncrypt.setPublicKey(publicKey);
  // return jsEncrypt.encrypt(data);

  // RSA encryption is not supported in browser
  //换一种nodejs的实现
  return crypto
    .publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_PADDING, // 明确指定填充方式
      },
      Buffer.from(data, "utf-8")
    )
    .toString("base64");
}

function aesEncrypt(data: string, key: string) {
  const keyBytes = CryptoJS.enc.Utf8.parse(key);
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(data, keyBytes, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return iv.toString(CryptoJS.enc.Base64) + ":" + encrypted.toString();
}

function urlDecode(value: string): string {
  return decodeURIComponent(value.replace(/\+/g, " "));
}

function generateAESKey(): string {
  const keyLength = 16;
  const randomBytes = new Uint8Array(keyLength);
  crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export const encryptPassword = (rsaPublicKeyText: string, password: string) => {
  if (!password) {
    return "";
  }
  // let rsaPublicKeyText = getCookie("panel_public_key");
  if (!rsaPublicKeyText) {
    console.log("RSA public key not found");
    return password;
  }
  rsaPublicKeyText = urlDecode(rsaPublicKeyText);

  const aesKey = generateAESKey();
  rsaPublicKeyText = rsaPublicKeyText.replaceAll('"', "");
  const rsaPublicKey = atob(rsaPublicKeyText);
  const keyCipher = rsaEncrypt(aesKey, rsaPublicKey);
  const passwordCipher = aesEncrypt(password, aesKey);
  return `${keyCipher}:${passwordCipher}`;
};
