import { Init, Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { Encryptor, SysSecret, SysSettingsService } from '../../../system/index.js';

/**
 * 授权
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class EncryptService {
  encryptor: Encryptor;

  @Inject()
  sysSettingService: SysSettingsService;

  async doInit() {
    const secret: SysSecret = await this.sysSettingService.getSecret();
    this.encryptor = new Encryptor(secret.encryptSecret);
  }

  // 加密函数
  encrypt(text: string) {
    return this.encryptor.encrypt(text);
  }

  // 解密函数
  decrypt(encryptedText: string) {
    return this.encryptor.decrypt(encryptedText);
  }
}
