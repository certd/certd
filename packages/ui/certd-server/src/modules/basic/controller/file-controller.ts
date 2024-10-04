import { Controller, Fields, Files, Get, Inject, Post, Provide, Query } from '@midwayjs/core';
import { BaseController, Constants, FileService, UploadFileItem, uploadTmpFileCacheKey } from '@certd/lib-server';
import send from 'koa-send';
import { nanoid } from 'nanoid';
import { cache } from '@certd/pipeline';
import { UploadFileInfo } from '@midwayjs/upload';

/**
 */
@Provide()
@Controller('/api/basic/file')
export class FileController extends BaseController {
  @Inject()
  fileService: FileService;

  @Post('/upload', { summary: 'sys:settings:view' })
  async upload(@Files() files: UploadFileInfo<string>[], @Fields() fields: any) {
    console.log('files', files, fields);
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
    return this.ok({
      key: cacheKey,
    });
  }

  @Get('/download', { summary: Constants.per.guest })
  async download(@Query('key') key: string) {
    let userId: any = null;
    if (!key.startsWith('/public')) {
      userId = this.getUserId();
    }
    const filePath = this.fileService.getFile(key, userId);
    this.ctx.response.attachment(filePath);
    await send(this.ctx, filePath);
  }
}
