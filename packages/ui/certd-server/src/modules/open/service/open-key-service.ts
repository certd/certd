import { Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { BaseService, Constants, CodeException, PageReq } from '@certd/lib-server';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { OpenKeyEntity } from '../entity/open-key.js';
import { utils } from '@certd/basic';
import crypto from 'crypto';
import dayjs from 'dayjs';

export type OpenKey = {
  userId: number;
  projectId?: number;
  keyId: string;
  keySecret: string;
  encrypt: boolean;
  scope: string;
};
@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class OpenKeyService extends BaseService<OpenKeyEntity> {
  @InjectEntityModel(OpenKeyEntity)
  repository: Repository<OpenKeyEntity>;

  //@ts-ignore
  getRepository() {
    return this.repository;
  }

  async page(pageReq: PageReq<OpenKeyEntity>) {
    return await super.page(pageReq);
  }

  async add(bean: OpenKeyEntity) {
    return await this.generate(bean.userId,bean.projectId, bean.scope);
  }

  async generate(userId: number, projectId?: number, scope: string = 'open') {
    const keyId = utils.id.simpleNanoId(18) + '_key';
    const secretKey = crypto.randomBytes(32);
    const keySecret = Buffer.from(secretKey).toString('hex');
    const entity = new OpenKeyEntity();
    entity.userId = userId;
    entity.projectId = projectId;
    entity.keyId = keyId;
    entity.keySecret = keySecret;
    entity.scope = scope ?? 'open';
    await this.repository.save(entity);
    return entity;
  }

  async getByKeyId(keyId: string) {
    if (!keyId) {
      throw new Error('keyId不能为空');
    }
    return this.repository.findOne({ where: { keyId } });
  }

  async verifyOpenKey(openKey: string): Promise<OpenKey> {
    // openkey 组成，content = base64({keyId,t,encrypt,signType}) ,sign = md5({keyId,t,encrypt,signType}secret) , key = content.sign
    const [content, sign] = openKey.split('.');
    const contentJson = Buffer.from(content, 'base64').toString();
    const { keyId, t, encrypt, signType } = JSON.parse(contentJson);
    // 正负不超过3分钟 ,timestamps单位为秒
    if (Math.abs(Number(t) - Math.floor(Date.now() / 1000)) > 180) {
      throw new CodeException(Constants.res.openKeyExpiresError);
    }

    const entity = await this.getByKeyId(keyId);
    if (!entity) {
      throw new Error('openKey不存在');
    }
    const secret = entity.keySecret;
    let computedSign = '';
    if (signType === 'md5') {
      computedSign = utils.hash.md5(contentJson + secret);
    } else if (signType === 'sha256') {
      computedSign = utils.hash.sha256(contentJson + secret);
    } else {
      throw new CodeException(Constants.res.openKeySignTypeError);
    }
    if (Buffer.from(computedSign).toString('base64') !== sign) {
      throw new CodeException(Constants.res.openKeySignError);
    }

    if (entity.userId==null) {
      throw new CodeException(Constants.res.openKeyError);
    }

    return {
      userId: entity.userId,
      keyId: entity.keyId,
      keySecret: entity.keySecret,
      encrypt: encrypt,
      projectId: entity.projectId,
      scope: entity.scope,
    };
  }

  async getApiToken(id: number) {
    if (!id) {
      throw new Error('id不能为空');
    }
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) {
      throw new Error('id不存在');
    }
    const { keyId, keySecret } = entity;
    const openKey = {
      keyId,
      t: dayjs().unix(),
      encrypt: false,
      signType: 'md5',
    };
    const content = JSON.stringify(openKey);
    const sign = utils.hash.md5(content + keySecret);
    return Buffer.from(content).toString('base64') + '.' + Buffer.from(sign).toString('base64');
  }
}
