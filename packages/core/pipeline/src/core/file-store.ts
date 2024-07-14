import { fileUtils } from "../utils/index.js";
import dayjs from "dayjs";
import path from "path";
import fs from "fs";
import { logger } from "../utils/index.js";

export type FileStoreOptions = {
  rootDir?: string;
  scope: string;
  parent: string;
};

export class FileStore {
  rootDir: string;
  scope: string;
  parent: string;
  constructor(options?: FileStoreOptions) {
    this.rootDir = fileUtils.getFileRootDir(options?.rootDir);
    this.scope = options?.scope || "0";
    this.parent = options?.parent || "0";
  }

  readFile(filePath: string) {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return fs.readFileSync(filePath);
  }

  writeFile(filename: string, file: Buffer) {
    const localPath = this.buildFilePath(filename);

    fs.writeFileSync(localPath, file);
    logger.info(`写入文件：${localPath}`);
    return localPath;
  }

  private buildFilePath(filename: string) {
    const parentDir = path.join(this.rootDir, this.scope + "", this.parent + "", dayjs().format("YYYY-MM-DD"));
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    return path.join(parentDir, filename);
  }

  deleteByParent(scope: string, parent: string) {
    const dir = path.join(this.rootDir, scope, parent);
    if (fs.existsSync(dir)) {
      fs.unlinkSync(dir);
    }
  }
}
