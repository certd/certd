const token = process.env.ATOMGIT_TOKEN;
const version = process.env.VERSION;

if (!token || !version) {
  console.error("错误: 请设置 ATOMGIT_TOKEN 和 VERSION");
  process.exit(1);
}

const apiBase = "https://api.atomgit.com/api/v5/repos/certd/certd";

async function request(method, url, options = {}) {
  const requestUrl = new URL(url);
  for (const [key, value] of Object.entries(options.params || {})) {
    requestUrl.searchParams.set(key, value);
  }

  const response = await fetch(requestUrl, {
    method,
    headers: options.headers,
    body: options.data ? JSON.stringify(options.data) : undefined,
  });
  const data = await response.json();

  if (!response.ok) {
    const error = new Error("HTTP " + response.status);
    error.response = { data };
    throw error;
  }

  return data;
}

async function main() {
  try {
    const releaseUrl = apiBase + "/releases/" + encodeURIComponent(version);
    const release = await request("GET", releaseUrl, {
      params: { access_token: token },
    });

    console.log("Current release: " + release.tag_name + ", status: " + release.release_status);
    if (release.release_status === "latest") {
      console.log("Already stable, skipping");
      return;
    }

    const updatedRelease = await request("PATCH", releaseUrl, {
      headers: { "Content-Type": "application/json" },
      params: { access_token: token },
      data: {
        name: release.name,
        body: release.body,
        release_status: "latest",
      },
    });

    console.log("Done! " + version + " is now stable: status=" + updatedRelease.release_status);
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
