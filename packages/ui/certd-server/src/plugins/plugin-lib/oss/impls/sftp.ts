import { BaseOssClient, OssFileItem } from "../api.js";
import path from "path";
import os from "os";
import fs from "fs";
import { SftpAccess, SshAccess, SshClient } from "../../ssh/index.js";

export default class SftpOssClientImpl extends BaseOssClient<SftpAccess> {
  async download(fileName: string, savePath: string): Promise<void> {
    const path = this.join(this.rootDir, fileName);
    const client = new SshClient(this.logger);
    const access = await this.ctx.accessService.getById<SshAccess>(this.access.sshAccess);
    await client.download({
      connectConf: access,
      filePath: path,
      savePath,
    });
  }

  async listDir(dir: string): Promise<OssFileItem[]> {
    const path = this.join(this.rootDir, dir);
    const client = new SshClient(this.logger);
    const access = await this.ctx.accessService.getById<SshAccess>(this.access.sshAccess);
    const res = await client.listDir({
      connectConf: access,
      dir: path,
    });

    return res.map(item => {
      return {
        path: this.join(path, item.filename),
        size: item.size,
        lastModified: item.attrs.atime * 1000,
      };
    });
  }
  async upload(filePath: string, fileContent: Buffer | string) {
    let tmpFilePath = fileContent as string;
    if (typeof fileContent !== "string") {
      tmpFilePath = path.join(os.tmpdir(), "cert", "oss", filePath);
      const dir = path.dirname(tmpFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(tmpFilePath, fileContent);
    }

    const access = await this.ctx.accessService.getById<SshAccess>(this.access.sshAccess);
    const key = this.join(this.rootDir, filePath);
    try {
      const client = new SshClient(this.logger);
      await client.uploadFiles({
        connectConf: access,
        mkdirs: true,
        transports: [
          {
            localPath: tmpFilePath,
            remotePath: key,
          },
        ],
        uploadType: "sftp",
        opts: {
          mode: this.access?.fileMode ?? undefined,
        },
      });
    } finally {
      // Remove temp file
      fs.unlinkSync(tmpFilePath);
    }
  }

  async remove(filePath: string, opts?: { joinRootDir?: boolean }) {
    const access = await this.ctx.accessService.getById<SshAccess>(this.access.sshAccess);
    const client = new SshClient(this.logger);
    if (opts?.joinRootDir !== false) {
      filePath = this.join(this.rootDir, filePath);
    }
    await client.removeFiles({
      connectConf: access,
      files: [filePath],
    });
  }
}
