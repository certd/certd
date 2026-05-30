export class Constant {
  private constructor() {}

  public static readonly HTTP_REQUEST_PREFIX: string = "https://open.chinanetcenter.com";
  public static readonly HTTPS_REQUEST_PREFIX: string = "https://";
  public static readonly HTTP_DOMAIN: string = "open.chinanetcenter.com";

  public static readonly APPLICATION_JSON: string = "application/json";

  public static readonly HEAD_SIGN_ACCESS_KEY: string = "x-cnc-accessKey";
  public static readonly HEAD_SIGN_TIMESTAMP: string = "x-cnc-timestamp";
  public static readonly HEAD_SIGN_ALGORITHM: string = "CNC-HMAC-SHA256";

  public static readonly X_CNC_AUTH_METHOD: string = "x-cnc-auth-method";

  public static readonly AUTH_METHOD: string = "AKSK";

  public static readonly END_POINT: string = "{endPoint}";
}
