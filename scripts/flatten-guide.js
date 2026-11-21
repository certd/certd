import { readdir, copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(rootDir, "docs", "guide");
const outputDir = path.join(rootDir, "tmp", "knowleage");

async function findMarkdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findMarkdownFiles(entryPath)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      files.push(entryPath);
    }
  }

  return files;
}

const markdownFiles = await findMarkdownFiles(sourceDir);
await mkdir(outputDir, { recursive: true });

const outputNames = new Set();
for (const sourcePath of markdownFiles) {
  const relativePath = path.relative(sourceDir, sourcePath);
  const outputName = relativePath.replace(/[\\/]/g, "__");
  if (outputNames.has(outputName)) {
    throw new Error(`Flattened filename collision: ${outputName}`);
  }
  outputNames.add(outputName);
  await copyFile(sourcePath, path.join(outputDir, outputName));
}

console.log(`Flattened ${markdownFiles.length} Markdown files into ${path.relative(rootDir, outputDir)}`);
