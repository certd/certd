import fs from 'fs';

export async function getVersion() {
  const pkg = await fs.promises.readFile('../../../package.json');
  const pkgJson = JSON.parse(pkg.toString());
  return pkgJson.version;
}
