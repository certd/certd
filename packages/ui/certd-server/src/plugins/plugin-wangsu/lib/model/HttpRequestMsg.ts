import { Constant } from "../common/Constant.js"; // Assuming you have a TypeScript version of this

export class HttpRequestMsg {
  uri: string;
  url: string;
  host: string;
  method: string;
  protocol: string;
  params: Record<string, string>;
  headers: Record<string, string>;
  body: string;
  signedHeaders: string;
  msg: any;

  constructor() {
    this.params = {};
    this.headers = {};
    this.putHeader("Content-Type", Constant.APPLICATION_JSON);
    this.putHeader(Constant.X_CNC_AUTH_METHOD, Constant.AUTH_METHOD);
  }

  putParam(name: string, value: string): void {
    this.params[name] = value;
  }

  getParam(name: string): string | null {
    const value = this.params[name];
    return value && value.trim() !== "" ? value : null;
  }

  getQueryString(): string {
    if (this.uri == undefined) return "";
    const index = this.uri.indexOf("?");
    if (this.method === "POST" || index === -1) {
      return "";
    }
    return this.uri.substring(index + 1);
  }

  putHeader(name: string, value: string): void {
    this.headers[name] = value;
  }

  getHeader(name: string): string | null {
    for (const key in this.headers) {
      if (key.toLowerCase() === name.toLowerCase()) {
        return this.headers[key];
      }
    }
    return null;
  }

  getHeaderByNames(...names: string[]): string | null {
    for (const name of names) {
      const value = this.getHeader(name);
      if (value) {
        return value;
      }
    }
    return null;
  }

  removeHeader(name: string): void {
    for (const key in this.headers) {
      if (key.toLowerCase() === name.toLowerCase()) {
        delete this.headers[key];
      }
    }
  }

  setJsonBody(object: any): void {
    this.body = JSON.stringify(object);
  }
}
