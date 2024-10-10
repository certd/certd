import { SysEmailConf, SysSettingsService } from '@certd/lib-server';
import * as _ from 'lodash-es';
import { UserSettingsService } from '../../mine/service/user-settings-service.js';

export async function getEmailSettings(sysSettingService: SysSettingsService, userSettingsService: UserSettingsService): Promise<SysEmailConf> {
  let conf = await sysSettingService.getSetting<SysEmailConf>(SysEmailConf);
  if (!conf.host || conf.usePlus == null) {
    //到userSetting里面去找
    const adminEmailSetting = await userSettingsService.getByKey('email', 1);
    if (adminEmailSetting) {
      const setting = JSON.parse(adminEmailSetting.setting);
      conf = _.merge(conf, setting);
      await sysSettingService.saveSetting(conf);
    }
  }
  return conf;
}
