import { BaseOssClient } from "../api.js";
import path from "path";
import os from "os";
import fs from "fs";
import { FtpAccess, FtpClient } from "../../ftp/index.js";

export default class FtpOssClientImpl extends BaseOssClient<FtpAccess> {
  join(...strs: string[]) {
    const str = super.join(...strs);
    if (!str.startsWith("/")) {
      return "/" + str;
    }
    return str;
  }

  async download(fileName: string, savePath: string) {
    const client = this.getFtpClient();
    await client.connect(async client => {
      const path = this.join(this.rootDir, fileName);
      await client.download(path, savePath);
    });
  }
  async listDir(dir: string) {
    const client = this.getFtpClient();
    return await client.connect(async (client: FtpClient) => {
      const path = this.join(this.rootDir, dir);
      const res = await client.listDir(path);
      return res.map(item => {
        return {
          path: this.join(path, item.name),
          size: item.size,
          lastModified: item.modifiedAt.getTime(),
        };
      });
    });
  }
  async upload(filePath: string, fileContent: Buffer | string) {
    const client = this.getFtpClient();
    await client.connect(async client => {
      let tmpFilePath = fileContent as string;
      if (typeof fileContent !== "string") {
        tmpFilePath = path.join(os.tmpdir(), "cert", "oss", filePath);
        const dir = path.dirname(tmpFilePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(tmpFilePath, fileContent);
      }

      try {
        // Write file to temp path
        const path = this.join(this.rootDir, filePath);
        await client.upload(tmpFilePath, path);
      } finally {
        // Remove temp file
        fs.unlinkSync(tmpFilePath);
      }
    });
  }

  private getFtpClient() {
    return new FtpClient({
      access: this.access,
      logger: this.logger,
    });
  }

  async remove(filePath: string, opts?: { joinRootDir?: boolean }) {
    if (opts?.joinRootDir !== false) {
      filePath = this.join(this.rootDir, filePath);
    }
    const client = this.getFtpClient();
    await client.connect(async client => {
      await client.client.remove(filePath);
      this.logger.info(`删除文件成功: ${filePath}`);
    });
  }
}
