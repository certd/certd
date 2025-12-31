import { BaseOssClient, OssFileItem } from "../api.js";
import path from "node:path";
import { S3Access } from "../../s3/access.js";
import fs from "fs";
import dayjs from "dayjs";

export default class S3OssClientImpl extends BaseOssClient<S3Access> {
  client: any;
  join(...strs: string[]) {
    const str = super.join(...strs);
    if (str.startsWith("/")) {
      return str.substring(1);
    }
    return str;
  }
  async init() {
    // import { S3Client } from "@aws-sdk/client-s3";
    //@ts-ignore
    const { S3Client } = await import("@aws-sdk/client-s3");
    this.client = new S3Client({
      forcePathStyle: true,
      //@ts-ignore
      s3ForcePathStyle: true,
      credentials: {
        accessKeyId: this.access.accessKeyId, // 默认 MinIO 访问密钥
        secretAccessKey: this.access.secretAccessKey, // 默认 MinIO 秘密密钥
      },
      region: "us-east-1",
      endpoint: this.access.endpoint,
    });
  }

  async download(filePath: string, savePath: string): Promise<void> {
    // @ts-ignore
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const key = path.join(this.rootDir, filePath);
    const params = {
      Bucket: this.access.bucket, // The name of the bucket. For example, 'sample_bucket_101'.
      Key: key, // The name of the object. For example, 'sample_upload.txt'.
    };
    const res = await this.client.send(new GetObjectCommand({ ...params }));
    const fileContent = fs.createWriteStream(savePath);
    res.Body.pipe(fileContent);

    this.logger.info(`文件下载成功: ${savePath}`);
  }

  async listDir(dir: string): Promise<OssFileItem[]> {
    // @ts-ignore
    const { ListObjectsCommand } = await import("@aws-sdk/client-s3");
    const dirKey = this.join(this.rootDir, dir);
    const params = {
      Bucket: this.access.bucket, // The name of the bucket. For example, 'sample_bucket_101'.
      Prefix: dirKey, // The name of the object. For example, 'sample_upload.txt'.
    };
    const res = await this.client.send(new ListObjectsCommand({ ...params }));
    if (!res.Contents) {
      return [];
    }
    return res.Contents.map(item => {
      return {
        path: item.Key,
        size: item.Size,
        lastModified: dayjs(item.LastModified).valueOf(),
      };
    });
  }
  async upload(filePath: string, fileContent: Buffer | string) {
    // @ts-ignore
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const key = path.join(this.rootDir, filePath);
    this.logger.info(`开始上传文件: ${key}`);
    const params = {
      Bucket: this.access.bucket, // The name of the bucket. For example, 'sample_bucket_101'.
      Key: key, // The name of the object. For example, 'sample_upload.txt'.
    };
    if (typeof fileContent === "string") {
      fileContent = fs.createReadStream(fileContent) as any;
    }
    await this.client.send(new PutObjectCommand({ Body: fileContent, ...params }));

    this.logger.info(`文件上传成功: ${filePath}`);
  }

  async remove(filePath: string, opts?: { joinRootDir?: boolean }) {
    if (opts?.joinRootDir !== false) {
      filePath = this.join(this.rootDir, filePath);
    }
    const key = filePath;
    // @ts-ignore
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.access.bucket,
        Key: key,
      })
    );

    this.logger.info(`文件删除成功: ${key}`);
  }
}
