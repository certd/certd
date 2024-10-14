import { logger } from '@certd/pipeline';
import fs from 'fs';

export async function getVersion() {
  try {
    const pkg = await fs.promises.readFile('./package.json');
    const pkgJson = JSON.parse(pkg.toString());
    return pkgJson.version;
  } catch (e) {
    logger.error(e);
    return 'unknown';
  }
}
