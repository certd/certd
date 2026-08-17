import axios from "axios";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const AtomgitAccessToken = process.env.ATOMGIT_TOKEN;

if (!AtomgitAccessToken) {
  console.error("错误: 请设置环境变量 ATOMGIT_TOKEN");
  console.error("  $env:ATOMGIT_TOKEN='your_token' (Windows PowerShell)");
  console.error("  或 export ATOMGIT_TOKEN=your_token (Linux/Mac)");
  process.exit(1);
}

const API_BASE = "https://api.atomgit.com/api/v5/repos/certd/certd";

/**
 * 获取发布版本列表
 */
async function listReleases() {
  const response = await axios.request({
    method: "GET",
    url: `${API_BASE}/releases`,
    params: {
      access_token: AtomgitAccessToken,
      direction: "desc",
      per_page: 10,
    },
  });
  return response.data;
}

/**
 * 触发 GitHub Actions workflow_dispatch 来执行稳定版发布
 */
async function triggerWorkflow(version) {
  const token = process.env.GH_TOKEN;
  if (!token) {
    console.error("错误: 请设置环境变量 GH_TOKEN");
    console.error("  $env:GH_TOKEN='your_token' (Windows PowerShell)");
    console.error("  需要在 https://github.com/settings/tokens 生成具有 repo 权限的 token");
    process.exit(1);
  }

  try {
    await axios.request({
      method: "POST",
      url: "https://api.github.com/repos/certd/certd/actions/workflows/stable-release.yml/dispatches",
      headers: {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": `Bearer ${token}`,
      },
      data: {
        ref: "v2-dev",
        inputs: {
          version: version,
        },
      },
    });

    console.log(`
✓ 已触发 GitHub Actions workflow`);
    console.log(`   版本: ${version}`);
    console.log(`   请前往 https://github.com/certd/certd/actions/workflows/stable-release.yml 查看执行状态`);
  } catch (error) {
    const status = error?.response?.status;
    const msg = error?.response?.data?.message || error.message;
    if (status === 404) {
      console.error(`
请求失败 (404): 工作流文件 stable-release.yml 尚未推送到远程仓库`);
      console.error("   请先提交并推送代码到 v2-dev 分支：");
      console.error("     git add .");
      console.error('     git commit -m "feat: add stable-release workflow"');
      console.error("     git push");
    } else {
      console.error(`
请求失败 (${status}): ${msg}`);
    }
    console.error("   请检查 GH_TOKEN 是否具有 actions:write 权限");
    process.exit(1);
  }
}


/**
 * 格式化输出版本列表
 */
function printReleases(releases) {
  console.log("\n");
  console.log("序号  | Tag 版本           | 名称                              | 状态");
  console.log("------|--------------------|-----------------------------------|--------");
  releases.forEach((r, i) => {
    const idx = String(i + 1).padEnd(4);
    const tag = (r.tag_name || "").padEnd(18);
    const name = (r.name || "").substring(0, 33).padEnd(33);
    const status = releaseStatusLabel(r.release_status);
    console.log(`${idx}  | ${tag} | ${name} | ${status}`);
  });
  console.log("\n");
}

function releaseStatusLabel(status) {
  if (status === "latest") {
    return "稳定版";
  }
  if (status === "pre") {
    return "预览版";
  }
  return status || "-";
}

async function main() {
  try {
    console.log("======= 获取发布版本列表... =======");
    const releases = await listReleases();

    if (!releases || releases.length === 0) {
      console.error("没有找到任何发布版本");
      process.exit(1);
    }

    printReleases(releases);

    const rl = createInterface({ input, output });

    // 请用户选择序号
    const answer = await rl.question("请输入序号 (1-" + releases.length + "): ");
    const idx = parseInt(answer.trim(), 10);
    if (isNaN(idx) || idx < 1 || idx > releases.length) {
      console.error("请输入有效序号 (1-" + releases.length + ")");
      rl.close();
      process.exit(1);
    }
    const selected = releases[idx - 1];
    const tag = selected.tag_name;

    // 确认
    const confirm = await rl.question(`确定要将 ${tag} 设置为稳定版(Stable)吗？(y/N): `);
    rl.close();

    if (confirm.trim().toLowerCase() !== "y") {
      console.log("已取消");
      process.exit(0);
    }

    // 触发 GitHub Actions workflow
    console.log(`
正在触发稳定版发布流程: ${tag}`);
    await triggerWorkflow(tag);

  } catch (error) {
    if (error?.response?.data) {
      console.error("请求失败:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("请求失败:", error.message || error);
    }
    process.exit(1);
  }
}

main();
