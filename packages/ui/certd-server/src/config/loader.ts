import path from 'path';
import _ from 'lodash';

const yaml = require('js-yaml');
const fs = require('fs');

function parseEnv() {
  const config = {};
  for (const key in process.env) {
    let keyName = key;
    if (!keyName.startsWith('certd_')) {
      continue;
    }
    keyName = keyName.replace('certd_', '');
    const configKey = keyName.replace('_', '.');
    _.set(config, configKey, process.env[key]);
  }
  return config;
}

export function load(env = '') {
  // Get document, or throw exception on error
  const yamlPath = path.join(process.cwd(), `.env.${env}.yaml`);
  const doc = yaml.load(fs.readFileSync(yamlPath, 'utf8'));
  _.merge(doc, parseEnv());
  return doc;
}

export function mergeConfig(config: any, envType: string) {
  _.merge(config, load(envType));
  const keys = _.get(config, 'auth.jwt.secret');
  if (keys) {
    config.keys = keys;
  }
  return config;
}
