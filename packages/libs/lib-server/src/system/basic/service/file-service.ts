import { Provide } from '@midwayjs/core';
import dayjs from 'dayjs';
import path from 'path';
import fs from 'fs';
import { cache, logger, utils } from '@certd/pipeline';
import { NotFoundException, ParamException, PermissionException } from '../../../basic/index.js';

export type UploadFileItem = {
  filename: string;
  tmpFilePath: string;
};
const uploadRootDir = './data/upload';
export const uploadTmpFileCacheKey = 'tmpfile_key_';
/**
 */
@Provide()
export class FileService {
  async saveFile(userId: number, tmpCacheKey: any, permission: 'public' | 'private') {
    if (tmpCacheKey.startsWith(`/${permission}`)) {
      //已经保存过，不需要再次保存
      return tmpCacheKey;
    }
    let fileName = '';
    let tmpFilePath = tmpCacheKey;
    if (uploadTmpFileCacheKey && tmpCacheKey.startsWith(uploadTmpFileCacheKey)) {
      const tmpFile: UploadFileItem = cache.get(tmpCacheKey);
      if (!tmpFile) {
        throw new ParamException('文件已过期，请重新上传');
      }
      tmpFilePath = tmpFile.tmpFilePath;
      fileName = tmpFile.filename || path.basename(tmpFilePath);
    }
    if (!tmpFilePath || !fs.existsSync(tmpFilePath)) {
      throw new Error('文件不存在,请重新上传');
    }
    const date = dayjs().format('YYYY_MM_DD');
    const random = Math.random().toString(36).substring(7);
    const userIdMd5 = Buffer.from(Buffer.from(userId + '').toString('base64')).toString('hex');
    const key = `/${permission}/${userIdMd5}/${date}/${random}_${fileName}`;
    let savePath = path.join(uploadRootDir, key);
    savePath = path.resolve(savePath);
    const parentDir = path.dirname(savePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    // eslint-disable-next-line node/no-unsupported-features/node-builtins
    const copyFile = utils.promises.promisify(fs.copyFile);
    await copyFile(tmpFilePath, savePath);
    try {
      fs.unlinkSync(tmpFilePath);
    } catch (e) {
      logger.error(e);
    }

    return key;
  }

  getFile(key: string, userId?: number) {
    if (!key) {
      throw new ParamException('参数错误');
    }
    if (key.indexOf('..') >= 0) {
      //安全性判断
      throw new ParamException('参数错误');
    }
    if (!key.startsWith('/')) {
      throw new ParamException('参数错误');
    }
    const keyArr = key.split('/');
    const permission = keyArr[1];
    const userIdMd5 = keyArr[2];
    if (permission !== 'public') {
      //非公开文件需要验证用户
      const userIdStr = Buffer.from(Buffer.from(userIdMd5, 'hex').toString('base64')).toString();
      const userIdInt: number = parseInt(userIdStr, 10);
      if (userId == null || userIdInt !== userId) {
        throw new PermissionException('无访问权限');
      }
    }
    const filePath = path.join(uploadRootDir, key);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('文件不存在');
    }
    return filePath;
  }
}
