import fs from "fs";
function getFileRootDir(rootDir?: string) {
  if (rootDir == null) {
    const userHome = process.env.HOME || process.env.USERPROFILE;
    rootDir = userHome + "/.certd/storage/";
  }

  if (!fs.existsSync(rootDir)) {
    fs.mkdirSync(rootDir, { recursive: true });
  }
  return rootDir;
}

export const fileUtils = {
  getFileRootDir,
};
