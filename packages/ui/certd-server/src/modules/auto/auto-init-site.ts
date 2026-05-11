import { logger } from '@certd/basic';
import { PlusService, SysInstallInfo, SysPrivateSettings, SysSettingsService } from '@certd/lib-server';
import { Config, Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import crypto from 'crypto';
import { nanoid } from 'nanoid';
import { UserService } from '../sys/authority/service/user-service.js';
import { SafeService } from "../sys/settings/safe-service.js";

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class AutoInitSite {
  @Inject()
  userService: UserService;

  @Config('typeorm.dataSource.default.type')
  dbType: string;

  @Inject()
  sysSettingsService: SysSettingsService;
  @Inject()
  plusService: PlusService;
  @Inject()
  safeService: SafeService;

  async init() {
    logger.info('初始化站点开始');
    await this.startOptimizeDb();
    //安装信息
    const installInfo: SysInstallInfo = await this.sysSettingsService.getSetting(SysInstallInfo);
    if (!installInfo.siteId) {
      installInfo.siteId = nanoid();
      await this.sysSettingsService.saveSetting(installInfo);
    }

    //private信息
    const privateInfo = await this.sysSettingsService.getSetting<SysPrivateSettings>(SysPrivateSettings);
    if (!privateInfo.jwtKey) {
      privateInfo.jwtKey = nanoid();
      await this.sysSettingsService.saveSetting(privateInfo);
    }

    if (!privateInfo.encryptSecret) {
      const secretKey = crypto.randomBytes(32);
      privateInfo.encryptSecret = secretKey.toString('base64');
      await this.sysSettingsService.saveSetting(privateInfo);
    }

    await this.sysSettingsService.backupSecret();

    //加载一次密钥
    await this.sysSettingsService.getSecret();


    // 授权许可
    try {
      await this.plusService.verify();
    } catch (e) {
      logger.error('授权许可验证失败', e);
    }
    
    //加载设置
    await this.sysSettingsService.reloadSettings();

    //加载站点隐藏配置
    await this.safeService.reloadHiddenStatus(true)
    logger.info('初始化站点完成');
  }

  async startOptimizeDb() {
    //优化数据库
    //检查当前数据库类型为sqlite
    if (this.dbType === 'better-sqlite3') {
      const res = await this.userService.repository.query('PRAGMA auto_vacuum;');
      if (!(res && res.length > 0 && res[0].auto_vacuum > 0)) {
        //未开启自动优化
        await this.userService.repository.query('PRAGMA auto_vacuum = INCREMENTAL;');
        logger.info('sqlite数据库自动优化已开启');
      }

      const optimizeDb = async () => {
        logger.info('sqlite数据库空间优化开始');
        await this.userService.repository.query('VACUUM');
        logger.info('sqlite数据库空间优化完成');
      };
      await optimizeDb();
      setInterval(optimizeDb, 1000 * 60 * 60 * 24);
    }
  }
}
