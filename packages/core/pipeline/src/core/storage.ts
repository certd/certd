import fs from "fs";
import path from "path";

export interface IStorage {
  get(scope: string, namespace: string, key: string): Promise<string | null>;
  set(scope: string, namespace: string, key: string, value: string): Promise<void>;
}

export class FileStorage implements IStorage {
  root: string;
  constructor(rootDir?: string) {
    if (rootDir == null) {
      const userHome = process.env.HOME || process.env.USERPROFILE;
      rootDir = userHome + "/.certd/storage/";
    }
    this.root = rootDir;

    if (!fs.existsSync(this.root)) {
      fs.mkdirSync(this.root, { recursive: true });
    }
  }

  writeFile(filePath: string, value: string) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, value);
    return filePath;
  }

  readFile(filePath: string) {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return fs.readFileSync(filePath).toString();
  }

  async get(scope: string, namespace: string, key: string): Promise<string | null> {
    const path = this.buildPath(scope, namespace, key);
    return this.readFile(path);
  }

  async set(scope: string, namespace: string, key: string, value: string): Promise<void> {
    const path = this.buildPath(scope, namespace, key);
    this.writeFile(path, value);
  }

  private buildPath(scope: string, namespace: string, key: string) {
    return `${this.root}/${scope}/${namespace}/${key}`;
  }
}

export class MemoryStorage implements IStorage {
  /**
   * 范围： user / pipeline / runtime / task
   */
  scope: any;
  namespace: any;
  context: {
    [scope: string]: {
      [key: string]: any;
    };
  } = {};

  async get(scope: string, namespace: string, key: string): Promise<string | null> {
    const context = this.context[scope];
    if (context == null) {
      return null;
    }
    return context[namespace + "." + key];
  }

  async set(scope: string, namespace: string, key: string, value: string): Promise<void> {
    let context = this.context[scope];
    if (context == null) {
      context = context[scope];
    }
    context[namespace + "." + key] = value;
  }
}
