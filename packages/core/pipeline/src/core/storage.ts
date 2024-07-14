import fs from "fs";
import path from "path";
import { fileUtils } from "../utils/util.file.js";

export interface IStorage {
  get(scope: string, namespace: string, version: string, key: string): Promise<string | null>;
  set(scope: string, namespace: string, version: string, key: string, value: string): Promise<void>;
  remove(scope: string, namespace: string, version: string, key: string): Promise<void>;
}

export class FileStorage implements IStorage {
  root: string;
  constructor(rootDir?: string) {
    this.root = fileUtils.getFileRootDir(rootDir);
  }

  async remove(scope: string, namespace: string, version: string, key: string): Promise<void> {
    if (key) {
      fs.unlinkSync(this.buildPath(scope, namespace, version, key));
    } else if (version) {
      fs.rmdirSync(this.buildPath(scope, namespace, version));
    } else if (namespace) {
      fs.rmdirSync(this.buildPath(scope, namespace));
    } else {
      fs.rmdirSync(this.buildPath(scope));
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

  async get(scope: string, namespace: string, version: string, key: string): Promise<string | null> {
    const path = this.buildPath(scope, namespace, version, key);
    return this.readFile(path);
  }

  async set(scope: string, namespace: string, version: string, key: string, value: string): Promise<void> {
    const path = this.buildPath(scope, namespace, version, key);
    this.writeFile(path, value);
  }

  private buildPath(scope: string, namespace?: string, version?: string, key?: string) {
    if (key) {
      return `${this.root}/${scope}/${namespace}/${version}/${key}`;
    } else if (version) {
      return `${this.root}/${scope}/${namespace}/${version}`;
    } else if (namespace) {
      return `${this.root}/${scope}/${namespace}`;
    } else {
      return `${this.root}/${scope}`;
    }
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

  async get(scope: string, namespace: string, version: string, key: string): Promise<string | null> {
    const scopeContext = this.context[scope];
    if (scopeContext == null) {
      return null;
    }
    const nsContext = scopeContext[namespace];
    if (nsContext == null) {
      return null;
    }
    const versionContext = nsContext[version];
    if (versionContext == null) {
      return null;
    }
    return versionContext[key];
  }

  async set(scope: string, namespace: string, version: string, key: string, value: string): Promise<void> {
    let scopeContext = this.context[scope];
    if (scopeContext == null) {
      scopeContext = scopeContext[scope];
    }
    let nsContext = scopeContext[namespace];
    if (nsContext == null) {
      nsContext = {};
      scopeContext[namespace] = nsContext;
    }
    let versionContext = nsContext[version];
    if (versionContext == null) {
      versionContext = {};
      nsContext[version] = versionContext;
    }
    versionContext[key] = value;
  }

  async remove(scope: string, namespace = "", version = "", key = "") {
    if (key) {
      if (this.context[scope] && this.context[scope][namespace] && this.context[scope][namespace][version]) {
        delete this.context[scope][namespace][version][key];
      }
    } else if (version) {
      if (this.context[scope] && this.context[scope][namespace]) {
        delete this.context[scope][namespace][version];
      }
    } else if (namespace) {
      if (this.context[scope]) {
        delete this.context[scope][namespace];
      }
    } else {
      delete this.context[scope];
    }
  }
}
