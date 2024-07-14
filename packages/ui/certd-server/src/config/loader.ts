import path from 'path';
import * as _ from 'lodash-es';
import yaml from 'js-yaml';
import fs from 'fs';

function parseEnv(defaultConfig: any) {
  const config = {};
  for (const key in process.env) {
    let keyName = key;
    if (!keyName.startsWith('certd_')) {
      continue;
    }
    keyName = keyName.replace('certd_', '');
    const configKey = keyName.replace('_', '.');
    const oldValue = _.get(defaultConfig, configKey);
    let value: any = process.env[key];
    if (typeof oldValue === 'boolean') {
      value = value === 'true';
    } else if (Number.isInteger(oldValue)) {
      value = parseInt(value, 10);
    } else if (typeof oldValue === 'number') {
      value = parseFloat(value);
    }
    _.set(config, configKey, value);
  }
  return config;
}

export function load(config, env = '') {
  // Get document, or throw exception on error
  const yamlPath = path.join(process.cwd(), `.env.${env}.yaml`);
  const doc = yaml.load(fs.readFileSync(yamlPath, 'utf8'));
  _.merge(doc, parseEnv(config));
  return doc;
}

export function mergeConfig(config: any, envType: string) {
  _.merge(config, load(config, envType));
  const keys = _.get(config, 'auth.jwt.secret');
  if (keys) {
    config.keys = keys;
  }
  return config;
}
