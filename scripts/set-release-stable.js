import axios from "axios";

const AtomgitAccessToken = process.env.ATOMGIT_TOKEN;
const Version = process.env.VERSION;

if (!AtomgitAccessToken) {
  console.error("错误: 请设置环境变量 ATOMGIT_TOKEN");
  process.exit(1);
}

if (!Version) {
  console.error("错误: 请设置环境变量 VERSION (如 v1.42.5)");
  process.exit(1);
}

const API_BASE = "https://api.atomgit.com/api/v5/repos/certd/certd";

async function main() {
  try {
    // GET 当前 release
    const getResp = await axios.request({
      method: "GET",
      url: `${API_BASE}/releases/${encodeURIComponent(Version)}`,
      params: { access_token: AtomgitAccessToken },
    });

    const release = getResp.data;
    console.log(`Current release: ${release.tag_name}, status: ${release.release_status}`);

    if (release.release_status === "latest") {
      console.log("Already stable, skipping");
      process.exit(0);
    }

    // PATCH 设为 latest
    const patchResp = await axios.request({
      method: "PATCH",
      url: `${API_BASE}/releases/${encodeURIComponent(Version)}`,
      headers: { "Content-Type": "application/json" },
      params: { access_token: AtomgitAccessToken },
      data: {
        name: release.name,
        body: release.body,
        release_status: "latest",
      },
    });

    console.log(`Done! ${Version} is now stable: status=${patchResp.data.release_status}`);
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
