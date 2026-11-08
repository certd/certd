import fs from "node:fs/promises";
import { BaseOssClient, OssFileItem } from "../api.js";
import { HttpAccess } from "../../http/access.js";

export default class HttpOssClientImpl extends BaseOssClient<HttpAccess | null> {
  constructor(opts: { rootDir?: string; access: HttpAccess | null }) {
    super(opts);
  }

  async download(fileName: string, savePath: string): Promise<void> {
    if (this.access) {
      const content = await this.access.doRequest(fileName);
      await fs.writeFile(savePath, Buffer.from(content), { mode: 0o600 });
      return;
    }

    let url: URL;
    try {
      url = new URL(fileName);
    } catch (e) {
      throw new Error("请填写完整的 HTTP/HTTPS 文件地址");
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("文件地址仅支持 HTTP/HTTPS 协议");
    }

    const http = this.ctx.http ?? this.utils.http;
    const content = await http.request({
      url: fileName,
      method: "GET",
      responseType: "arraybuffer",
      timeout: 60000,
      maxContentLength: 10 * 1024 * 1024,
      logReq: false,
      logRes: false,
    });
    await fs.writeFile(savePath, Buffer.from(content), { mode: 0o600 });
  }

  async upload(_fileName: string, _fileContent: Buffer | string): Promise<void> {
    throw new Error("HTTP 来源不支持上传文件");
  }

  async remove(_fileName: string): Promise<void> {
    throw new Error("HTTP 来源不支持删除文件");
  }

  async listDir(_dir: string): Promise<OssFileItem[]> {
    throw new Error("HTTP 来源不支持列出目录");
  }
}
