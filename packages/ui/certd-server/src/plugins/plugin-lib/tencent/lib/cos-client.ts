import { TencentAccess } from "../access.js";
import { ILogger, safePromise } from "@certd/basic";
import fs from "fs";

export class TencentCosClient {
  access: TencentAccess;
  logger: ILogger;
  region: string;
  bucket: string;

  constructor(opts: { access: TencentAccess; logger: ILogger; region: string; bucket: string }) {
    this.access = opts.access;
    this.logger = opts.logger;
    this.bucket = opts.bucket;
    this.region = opts.region;
  }

  async getCosClient() {
    const sdk = await import("cos-nodejs-sdk-v5");
    const clientConfig = {
      SecretId: this.access.secretId,
      SecretKey: this.access.secretKey,
    };
    return new sdk.default(clientConfig);
  }

  async uploadFile(key: string, file: Buffer | string) {
    const cos = await this.getCosClient();
    return safePromise((resolve, reject) => {
      let readableStream = file as any;
      if (typeof file === "string") {
        readableStream = fs.createReadStream(file);
      }
      cos.putObject(
        {
          Bucket: this.bucket /* 必须 */,
          Region: this.region /* 必须 */,
          Key: key /* 必须 */,
          Body: readableStream, // 上传文件对象
          onProgress: function (progressData) {
            console.log(JSON.stringify(progressData));
          },
        },
        function (err, data) {
          if (err) {
            reject(err);
            return;
          }
          resolve(data);
        }
      );
    });
  }

  async removeFile(key: string) {
    const cos = await this.getCosClient();
    return safePromise((resolve, reject) => {
      cos.deleteObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
        },
        function (err, data) {
          if (err) {
            reject(err);
            return;
          }
          resolve(data);
        }
      );
    });
  }

  async downloadFile(key: string, savePath: string) {
    const cos = await this.getCosClient();
    const writeStream = fs.createWriteStream(savePath);
    return safePromise((resolve, reject) => {
      cos.getObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
          Output: writeStream,
        },
        function (err, data) {
          if (err) {
            reject(err);
            return;
          }
          resolve(data);
        }
      );
    });
  }

  async listDir(dirKey: string) {
    const cos = await this.getCosClient();
    return safePromise((resolve, reject) => {
      cos.getBucket(
        {
          Bucket: this.bucket,
          Region: this.region,
          Prefix: dirKey,
          MaxKeys: 1000,
        },
        function (err, data) {
          if (err) {
            reject(err);
            return;
          }
          resolve(data.Contents);
        }
      );
    });
  }
}
