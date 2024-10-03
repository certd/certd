import { SysSettingsEntity } from './system/index.js';

export * from './basic/index.js';
export * from './system/index.js';
export { LibServerConfiguration as Configuration } from './configuration.js';

export const libServerEntities = [SysSettingsEntity];
