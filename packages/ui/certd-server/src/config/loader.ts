import path from 'path';
import * as _ from 'lodash-es';
import yaml from 'js-yaml';
import fs from 'fs';
import { logger } from '../utils/logger.js';

function parseEnv(defaultConfig: any) {
  const config = {};
  for (const key in process.env) {
    let keyName = key;
    if (!keyName.startsWith('certd_')) {
      continue;
    }
    keyName = keyName.replace('certd_', '');
    const configKey = keyName.replaceAll('_', '.');
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
  logger.info('load config', env);
  const yamlPath = path.join(process.cwd(), `.env.${env}.yaml`);
  if (fs.existsSync(yamlPath)) {
    const doc = yaml.load(fs.readFileSync(yamlPath, 'utf8'));
    return _.merge(doc, parseEnv(config));
  }
  return parseEnv(config);
}

export function mergeConfig(config: any, envType: string) {
  _.merge(config, load(config, envType));
  const keys = _.get(config, 'auth.jwt.secret');
  if (keys) {
    config.keys = keys;
  }
  return config;
}
