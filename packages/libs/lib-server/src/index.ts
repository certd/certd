import { SysSettingsEntity } from "./system/index.js";
import { AccessEntity } from "./user/access/entity/access.js";
import { AddonEntity } from "./user/index.js";
export * from "./basic/index.js";
export * from "./system/index.js";
export * from "./user/index.js";
export { LibServerConfiguration as Configuration } from "./configuration.js";

export const libServerEntities = [SysSettingsEntity, AccessEntity, AddonEntity];
