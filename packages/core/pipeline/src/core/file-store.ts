import { fileUtils } from "../utils/util.file";
import dayjs from "dayjs";
import path from "path";
import fs from "fs";

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
    return localPath;
  }

  private buildFilePath(filename: string) {
    const parentDir = path.join(this.rootDir, this.scope + "", dayjs().format("YYYY-MM-DD"), this.parent + "");
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    return path.join(parentDir, filename);
  }
}
