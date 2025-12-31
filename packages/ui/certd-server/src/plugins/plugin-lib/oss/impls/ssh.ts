import { BaseOssClient, OssClientRemoveByOpts, OssFileItem } from "../api.js";
import path from "path";
import os from "os";
import fs from "fs";
import { SshAccess, SshClient } from "../../ssh/index.js";

//废弃
export default class SshOssClientImpl extends BaseOssClient<SshAccess> {
  download(fileName: string, savePath: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
  removeBy(removeByOpts: OssClientRemoveByOpts): Promise<void> {
    throw new Error("Method not implemented.");
  }
  listDir(dir: string): Promise<OssFileItem[]> {
    throw new Error("Method not implemented.");
  }
  async upload(filePath: string, fileContent: Buffer) {
    if (!filePath) {
      filePath = "";
    }
    filePath = filePath.trim();
    const tmpFilePath = path.join(os.tmpdir(), "cert", "http", filePath);

    // Write file to temp path
    const dir = path.dirname(tmpFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(tmpFilePath, fileContent);

    const key = this.rootDir + filePath;
    try {
      const client = new SshClient(this.logger);
      await client.uploadFiles({
        connectConf: this.access,
        mkdirs: true,
        transports: [
          {
            localPath: tmpFilePath,
            remotePath: key,
          },
        ],
      });
    } finally {
      // Remove temp file
      fs.unlinkSync(tmpFilePath);
    }
  }

  async remove(filePath: string, opts?: { joinRootDir?: boolean }) {
    if (opts?.joinRootDir !== false) {
      filePath = this.join(this.rootDir, filePath);
    }
    const client = new SshClient(this.logger);
    await client.removeFiles({
      connectConf: this.access,
      files: [filePath],
    });
  }
}
