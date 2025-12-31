import { BaseOssClient, OssFileItem } from "../api.js";
import { AliossAccess, AliossClient, AliyunAccess } from "../../aliyun/index.js";
import dayjs from "dayjs";

export default class AliOssClientImpl extends BaseOssClient<AliossAccess> {
  client: AliossClient;
  join(...strs: string[]) {
    const str = super.join(...strs);
    if (str.startsWith("/")) {
      return str.substring(1);
    }
    return str;
  }
  async init() {
    const aliyunAccess = await this.ctx.accessService.getById<AliyunAccess>(this.access.accessId);
    const client = new AliossClient({
      access: aliyunAccess,
      bucket: this.access.bucket,
      region: this.access.region,
    });
    await client.init();
    this.client = client;
  }
  async download(filePath: string, savePath: string): Promise<void> {
    const key = this.join(this.rootDir, filePath);
    await this.client.downloadFile(key, savePath);
  }
  async listDir(dir: string): Promise<OssFileItem[]> {
    const dirKey = this.join(this.rootDir, dir) + "/";
    const list = await this.client.listDir(dirKey);
    this.logger.info(`列出目录: ${dirKey},文件数：${list.length}`);
    return list.map(item => {
      return {
        path: item.name,
        lastModified: dayjs(item.lastModified).valueOf(),
        size: item.size,
      };
    });
  }
  async upload(filePath: string, fileContent: Buffer | string) {
    const key = this.join(this.rootDir, filePath);
    this.logger.info(`开始上传文件: ${key}`);
    await this.client.uploadFile(key, fileContent);

    this.logger.info(`文件上传成功: ${filePath}`);
  }

  async remove(filePath: string, opts?: { joinRootDir?: boolean }) {
    if (opts?.joinRootDir !== false) {
      filePath = this.join(this.rootDir, filePath);
    }
    const key = filePath;
    // remove file from alioss
    await this.client.removeFile(key);
    this.logger.info(`文件删除成功: ${key}`);
  }
}
