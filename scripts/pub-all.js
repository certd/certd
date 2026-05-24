import childProcess from "child_process";
import fs from "fs";
import path from "path";

function run(command, args, options = {}) {
  const result = childProcess.spawnSync(command, args, {
    stdio: options.stdio ?? "pipe",
    shell: process.platform === "win32",
    encoding: "utf-8",
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

function printOutput(result) {
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
}

function isAlreadyPublishedError(result) {
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return output.includes("You cannot publish over the previously published versions");
}

function getWorkspacePackages() {
  const result = run("pnpm", ["list", "-r", "--depth", "-1", "--json"], {
    stdio: "pipe",
  });

  if (result.status !== 0) {
    console.error(result.stderr);
    throw new Error("获取 workspace 包列表失败");
  }

  return JSON.parse(result.stdout);
}

function hasPubScript(packagePath) {
  const packageJsonPath = path.join(packagePath, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  return Boolean(packageJson.scripts?.pub);
}

const packages = getWorkspacePackages().filter(item => item.name !== "root");
let skippedCount = 0;
let alreadyPublishedCount = 0;

for (const item of packages) {
  const packagePath = item.path;

  if (!hasPubScript(packagePath)) {
    skippedCount++;
    console.log(`[pub_all] 跳过 ${item.name}，未定义 pub 脚本`);
    continue;
  }

  console.log(`\n[pub_all] 开始发布 ${item.name}`);
  const result = run("pnpm", ["--dir", packagePath, "run", "pub"]);
  printOutput(result);

  if (result.status === 0) {
    console.log(`[pub_all] ${item.name} 发布完成`);
  } else if (isAlreadyPublishedError(result)) {
    alreadyPublishedCount++;
    console.warn(`[pub_all] ${item.name} 当前版本已发布，继续发布其他包`);
  } else {
    console.error(`[pub_all] ${item.name} 发布失败，停止发布`);
    process.exit(result.status ?? 1);
  }
}

console.log(`\n[pub_all] 发布任务完成，跳过 ${skippedCount} 个未定义 pub 脚本的包，${alreadyPublishedCount} 个包版本已存在`);
