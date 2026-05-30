import { HttpRequestMsg } from "../model/HttpRequestMsg.js";
import { AkSkConfig } from "../model/AkSkConfig.js";
import { CryptoUtils } from "../util/CryptoUtils.js";
import { HttpUtils } from "../util/HttpUtils.js";
import { Constant } from "../common/Constant.js";

export class AkSkAuth {
  public static invoke(akSkConfig: AkSkConfig, jsonBody: string): Promise<string | null> {
    const requestMsg = AkSkAuth.transferHttpRequestMsg(akSkConfig, jsonBody);
    AkSkAuth.getAuthAndSetHeaders(requestMsg, akSkConfig.accessKey, akSkConfig.secretKey);
    return HttpUtils.call(requestMsg);
  }

  static transferHttpRequestMsg(akSkConfig: AkSkConfig, jsonBody: string): HttpRequestMsg {
    const requestMsg = new HttpRequestMsg();
    requestMsg.uri = akSkConfig.uri;
    if (akSkConfig.endPoint && akSkConfig.endPoint !== Constant.END_POINT) {
      requestMsg.host = akSkConfig.endPoint;
      requestMsg.url = `${Constant.HTTPS_REQUEST_PREFIX}${akSkConfig.endPoint}${requestMsg.uri}`;
    } else {
      requestMsg.host = Constant.HTTP_DOMAIN;
      requestMsg.url = `${Constant.HTTP_REQUEST_PREFIX}${requestMsg.uri}`;
    }
    requestMsg.method = akSkConfig.method;
    requestMsg.signedHeaders = AkSkAuth.getSignedHeaders(akSkConfig.signedHeaders);
    if (["POST", "PUT", "PATCH", "DELETE"].indexOf(akSkConfig.method) !== -1) {
      requestMsg.body = jsonBody;
    }
    return requestMsg;
  }

  static getAuthAndSetHeaders(requestMsg: HttpRequestMsg, accessKey: string, secretKey: string): void {
    const timeStamp = ((Date.now() / 1000) | 0).toString();
    requestMsg.headers["Host"] = requestMsg.host;
    requestMsg.headers[Constant.HEAD_SIGN_ACCESS_KEY] = accessKey;
    requestMsg.headers[Constant.HEAD_SIGN_TIMESTAMP] = timeStamp;
    requestMsg.headers["Accept"] = Constant.APPLICATION_JSON;
    const signature = AkSkAuth.getSignature(requestMsg, secretKey, timeStamp);
    requestMsg.headers["Authorization"] = AkSkAuth.genAuthorization(accessKey, AkSkAuth.getSignedHeaders(requestMsg.signedHeaders), signature);
  }

  private static genAuthorization(accessKey: string, signedHeaders: string, signature: string): string {
    return `${Constant.HEAD_SIGN_ALGORITHM} Credential=${accessKey}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  }

  private static getSignature(requestMsg: HttpRequestMsg, secretKey: string, timestamp: string): string {
    const bodyStr = requestMsg.body || "";
    const hashedRequestPayload = CryptoUtils.sha256Hex(bodyStr);
    const canonicalRequest = `${requestMsg.method}\n${requestMsg.uri.split("?")[0]}\n${decodeURIComponent(requestMsg.getQueryString())}\n${AkSkAuth.getCanonicalHeaders(
      requestMsg.headers,
      AkSkAuth.getSignedHeaders(requestMsg.signedHeaders)
    )}\n${AkSkAuth.getSignedHeaders(requestMsg.signedHeaders)}\n${hashedRequestPayload}`;
    const stringToSign = `${Constant.HEAD_SIGN_ALGORITHM}\n${timestamp}\n${CryptoUtils.sha256Hex(canonicalRequest)}`;
    return CryptoUtils.hmac256(secretKey, stringToSign).toLowerCase();
  }

  private static getCanonicalHeaders(headers: Record<string, string>, signedHeaders: string): string {
    const headerNames = signedHeaders.split(";");
    let canonicalHeaders = "";
    for (const headerName of headerNames) {
      const headerValue = AkSkAuth.getValueByHeader(headerName, headers);
      if (headerValue !== null) {
        canonicalHeaders += `${headerName}:${headerValue.toLowerCase()}\n`;
      } else {
        // Handle missing headers if necessary, e.g., log a warning or skip
        console.warn(`Header ${headerName} not found in provided headers.`);
      }
    }
    return canonicalHeaders;
  }

  private static getSignedHeaders(signedHeaders: string): string {
    if (!signedHeaders) {
      return "content-type;host";
    }
    const headers = signedHeaders.split(";");
    return headers
      .map(header => header.toLowerCase())
      .sort()
      .join(";");
  }

  private static getValueByHeader(name: string, customHeaderMap: { [key: string]: string }): string | null {
    for (const key in customHeaderMap) {
      if (key.toLowerCase() === name.toLowerCase()) {
        return customHeaderMap[key];
      }
    }
    return null;
  }
}
