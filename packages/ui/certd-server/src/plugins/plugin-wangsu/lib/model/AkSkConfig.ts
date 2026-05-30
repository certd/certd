export class AkSkConfig {
  private _accessKey: string | undefined;
  private _secretKey: string | undefined;
  private _uri: string | undefined;
  private _endPoint: string | undefined;
  private _method: string | undefined;
  private _signedHeaders: string | undefined;

  public get accessKey(): string {
    return this._accessKey;
  }

  public set accessKey(value: string) {
    this._accessKey = value;
  }

  public get secretKey(): string {
    return this._secretKey;
  }

  public set secretKey(value: string) {
    this._secretKey = value;
  }

  public get uri(): string {
    return this._uri;
  }

  public set uri(value: string) {
    this._uri = value;
  }

  public get endPoint(): string {
    return this._endPoint;
  }

  public set endPoint(value: string) {
    this._endPoint = value;
  }

  public get method(): string {
    return this._method;
  }

  public set method(value: string) {
    this._method = value;
  }

  public get signedHeaders(): string {
    return this._signedHeaders;
  }

  public set signedHeaders(value: string) {
    this._signedHeaders = value;
  }
}
