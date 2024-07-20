import fs from 'fs';
//读取 packages/core/pipline/package.json的版本号
import { default as packageJson } from './tsconfig.json' assert { type: 'json' };
delete packageJson.references;
fs.writeFileSync('./tsconfig.json', JSON.stringify(packageJson, null, 2));
