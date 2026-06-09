import { Controller, Fields, Files, Get, Inject, Post, Provide, Query } from "@midwayjs/core";
import { BaseController, Constants, FileService, PermissionException, UploadFileItem, uploadTmpFileCacheKey } from "@certd/lib-server";
import send from "koa-send";
import { nanoid } from "nanoid";
import { cache } from "@certd/basic";
import { UploadFileInfo } from "@midwayjs/upload";
import { AuthService } from "../../modules/sys/authority/service/auth-service.js";

const imageExtSet = new Set([".apng", ".avif", ".bmp", ".gif", ".ico", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);
const imageCacheSeconds = 3 * 24 * 60 * 60;

export function isImageFile(filePath: string) {
  return imageExtSet.has(filePath.substring(filePath.lastIndexOf(".")).toLowerCase());
}

export function getImageDownloadOptions(filePath: string) {
  if (!isImageFile(filePath)) {
    return undefined;
  }
  return {
    maxage: imageCacheSeconds * 1000,
    setHeaders(res: any) {
      res.setHeader("Cache-Control", `public,max-age=${imageCacheSeconds}`);
    },
  };
}

/**
 */
@Provide()
@Controller("/api/basic/file")
export class FileController extends BaseController {
  @Inject()
  fileService: FileService;

  @Inject()
  authService: AuthService;

  @Post("/upload", { description: Constants.per.authOnly })
  async upload(@Files() files: UploadFileInfo<string>[], @Fields() fields: any, @Query("autoSave") autoSave: string) {
    console.log("files", files, fields);
    const cacheKey = uploadTmpFileCacheKey + nanoid();
    const file = files[0];
    cache.set(
      cacheKey,
      {
        filename: file.filename,
        tmpFilePath: file.data,
      } as UploadFileItem,
      {
        ttl: 1000 * 60 * 60,
      }
    );
    if (autoSave === "true") {
      const key = await this.fileService.saveFile(this.getUserId(), cacheKey, "public");
      return this.ok({
        key,
        url: `/api/basic/file/download?key=${encodeURIComponent(key)}`,
      });
    }
    return this.ok({
      key: cacheKey,
    });
  }

  @Get("/download", { description: Constants.per.guestOptionalAuth })
  async download(@Query("key") key: string) {
    const filePath = this.getDownloadFilePath(key);
    const sendOptions = getImageDownloadOptions(filePath);
    if (!sendOptions) {
      this.ctx.response.attachment(filePath);
    }
    await send(this.ctx, filePath, sendOptions);
  }

  private getDownloadFilePath(key: string) {
    const isPrivateFile = !key.startsWith("/public");
    const userId = isPrivateFile ? this.getUserId() : null;
    try {
      return this.fileService.getFile(key, userId);
    } catch (e) {
      if (!(e instanceof PermissionException) || !isPrivateFile || !this.authService.isAdmin(this.ctx)) {
        throw e;
      }
      const adminFilePath = this.fileService.getFile(key, userId, true);
      if (!isImageFile(adminFilePath)) {
        throw e;
      }
      return adminFilePath;
    }
  }
}
