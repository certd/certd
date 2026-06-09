import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";
import { HttpRequestConfig } from "@certd/basic";

/**
 */
@IsAccess({
  name: "github",
  title: "Github授权",
  desc: "",
  icon: "ion:logo-github",
})
export class GithubAccess extends BaseAccess {
  @AccessInput({
    title: "接口地址",
    component: {
      placeholder: "可以使用反向代理地址",
      component: {
        name: "a-input",
        vModel: "value",
      },
    },
    helper: "默认值：https://api.github.com",
    encrypt: false,
    required: false,
  })
  endpoint!: string;

  @AccessInput({
    title: "GithubToken",
    component: {
      placeholder: "GithubToken",
      component: {
        name: "a-input",
        vModel: "value",
      },
    },
    helper: "支持匿名访问的接口可以不填",
    encrypt: true,
    required: false,
  })
  githubToken!: string;

  @AccessInput({
    title: "HttpProxy",
    component: {
      placeholder: "http://192.168.x.x:10811",
      component: {
        name: "a-input",
        vModel: "value",
      },
    },
    encrypt: false,
    required: false,
  })
  httpProxy!: string;

  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "TestRequest",
    },
    helper: "点击测试接口是否正常",
  })
  testRequest = true;

  async onTestRequest() {
    await this.getRelease({ repoName: "certd/certd" });
    return "ok";
  }

  async getRelease(req: { repoName: string }) {
    const url = `/repos/${req.repoName}/releases/latest`;
    return await this.doRequest({
      url,
      method: "GET",
      data: {},
    });
  }

  async doRequest(req: HttpRequestConfig) {
    /**
     * async function getLatestRelease() {
     *   const { REPO_OWNER, REPO_NAME, API_URL, TOKEN } = CONFIG.GITHUB;
     *   const url = `${API_URL}/${REPO_OWNER}/${REPO_NAME}/releases/latest`;
     *
     *   try {
     *     const response = await axios.get(url, {
     *       headers: TOKEN ? { Authorization: `token ${TOKEN}` } : {}
     *     });
     *
     *     return {
     *         tag_name: response.data.tag_name,
     *         name: response.data.name || '无标题',
     *         body: response.data.body || '无描述内容',
     *         html_url: response.data.html_url,
     *         published_at: new Date(response.data.published_at).toLocaleString(),
     *         assets: response.data.assets.map(a => ({
     *           name: a.name,
     *           download_url: a.browser_download_url
     *         }))
     *     };
     *   } catch (error) {
     *     if (error.response?.status === 404) {
     *       return { success: false, error: '仓库未找到或没有Release' };
     *     }
     *     return { success: false, error: `请求失败: ${error.message}` };
     *   }
     * }
     */

    const headers: any = {};
    if (this.githubToken) {
      headers.Authorization = `token ${this.githubToken}`;
    }
    const baseURL = this.endpoint || "https://api.github.com";
    const res = await this.ctx.http.request({
      url: req.url,
      baseURL,
      method: req.method || "POST",
      data: req.data,
      headers,
      httpProxy: this.httpProxy || undefined,
    });

    if (res) {
      return res;
    }
    throw new Error(res.message || res);
  }
}

new GithubAccess();
