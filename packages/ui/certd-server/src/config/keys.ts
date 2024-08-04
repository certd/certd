import fs from 'fs';
import yaml from 'js-yaml';
import * as _ from 'lodash-es';
import { nanoid } from 'nanoid';
import path from 'path';
const KEYS_FILE = './data/keys.yaml';
export class Keys {
  jwtKey: string = nanoid();
  cookieKeys: string[] = [nanoid()];

  static load(): Keys {
    const keys = new Keys();
    if (fs.existsSync(KEYS_FILE)) {
      const content = fs.readFileSync(KEYS_FILE, 'utf8');
      const json = yaml.load(content);
      _.merge(keys, json);
    }
    keys.save();
    return keys;
  }

  save() {
    const parent = path.dirname(KEYS_FILE);
    if (!fs.existsSync(parent)) {
      fs.mkdirSync(parent, {
        recursive: true,
      });
    }
    fs.writeFileSync(KEYS_FILE, yaml.dump(this));
  }
}
