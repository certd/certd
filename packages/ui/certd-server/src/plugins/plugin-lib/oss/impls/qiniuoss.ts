import { QiniuAccess, QiniuClient, QiniuOssAccess } from "../../qiniu/index.js";
import { BaseOssClient, OssFileItem } from "../api.js";

export default class QiniuOssClientImpl extends BaseOssClient<QiniuOssAccess> {
  client: QiniuClient;

  join(...strs: string[]) {
    const str = super.join(...strs);
    if (str.startsWith("/")) {
      return str.substring(1);
    }
    return str;
  }
  async init() {
    const qiniuAccess = await this.ctx.accessService.getById<QiniuAccess>(this.access.accessId);
    this.client = new QiniuClient({
      access: qiniuAccess,
      logger: this.logger,
      http: this.ctx.utils.http,
    });
  }

  async download(fileName: string, savePath: string): Promise<void> {
    const path = this.join(this.rootDir, fileName);
    await this.client.downloadFile(this.access.bucket, path, savePath);
  }
  async listDir(dir: string): Promise<OssFileItem[]> {
    const path = this.join(this.rootDir, dir);
    const res = await this.client.listDir(this.access.bucket, path);
    return res.items.map(item => {
      return {
        path: item.key,
        size: item.fsize,
        //ns ，纳秒，去掉低4位 为毫秒
        lastModified: Math.floor(item.putTime / 10000),
      };
    });
  }
  async upload(filePath: string, fileContent: Buffer | string) {
    const path = this.join(this.rootDir, filePath);
    await this.client.uploadFile(this.access.bucket, path, fileContent);
  }

  async remove(filePath: string, opts?: { joinRootDir?: boolean }) {
    if (opts?.joinRootDir !== false) {
      filePath = this.join(this.rootDir, filePath);
    }
    await this.client.removeFile(this.access.bucket, filePath);
  }
}
