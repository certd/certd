import CryptoJS from "crypto-js";

export class CryptoUtils {
  private constructor() {}

  /**
   * hmac+sha256+hex
   */
  public static sha256Hex(s: string): string {
    const hash = CryptoJS.SHA256(s);
    return hash.toString(CryptoJS.enc.Hex).toLowerCase();
  }

  /**
   * hmac+sha256
   */
  public static hmac256(secretKey: string, message: string): string {
    const keyWordArray = CryptoJS.enc.Utf8.parse(secretKey);
    const messageWordArray = CryptoJS.enc.Utf8.parse(message);
    const hash = CryptoJS.HmacSHA256(messageWordArray, keyWordArray);
    return hash.toString(CryptoJS.enc.Hex).toLowerCase();
  }
}
