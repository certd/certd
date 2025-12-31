import { OssClientContext } from "./api.js";

export class OssClientFactory {
  async getClassByType(type: string) {
    if (type === "alioss") {
      const module = await import("./impls/alioss.js");
      return module.default;
    } else if (type === "ssh") {
      const module = await import("./impls/ssh.js");
      return module.default;
    } else if (type === "sftp") {
      const module = await import("./impls/sftp.js");
      return module.default;
    } else if (type === "ftp") {
      const module = await import("./impls/ftp.js");
      return module.default;
    } else if (type === "tencentcos") {
      const module = await import("./impls/tencentcos.js");
      return module.default;
    } else if (type === "qiniuoss") {
      const module = await import("./impls/qiniuoss.js");
      return module.default;
    } else if (type === "s3") {
      const module = await import("./impls/s3.js");
      return module.default;
    } else {
      throw new Error(`暂不支持此文件上传方式: ${type}`);
    }
  }
  async createOssClientByType(type: string, opts: { rootDir?: string; access: any; ctx: OssClientContext }) {
    const cls = await this.getClassByType(type);
    if (cls) {
      // @ts-ignore
      const instance = new cls(opts);
      await instance.setCtx(opts.ctx);
      return instance;
    }
  }
}

export const ossClientFactory = new OssClientFactory();
