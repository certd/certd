import assert from "assert";
import { CustomAcmeProviderService } from "./custom-acme-provider-service.js";

describe("CustomAcmeProviderService", () => {
  const providers = [
    { sslProvider: "myca", title: "我的CA", directoryUrl: "https://myca.example.com/directory", reverseProxy: "myca-proxy.example.com" },
    { sslProvider: "myca2", title: "二号CA", directoryUrl: "https://myca2.example.com/directory" },
  ];

  function createService() {
    const service = new CustomAcmeProviderService();
    service.sysSettingsService = {
      async getSetting(type: any) {
        return { customAcmeProviders: providers };
      },
    } as any;
    return service;
  }

  it("getAll 返回系统配置的全部自定义ACME", async () => {
    const service = createService();
    const list = await service.getAll();
    assert.equal(list.length, 2);
    assert.equal(list[0].sslProvider, "myca");
    assert.equal(list[0].directoryUrl, "https://myca.example.com/directory");
    assert.equal(list[0].reverseProxy, "myca-proxy.example.com");
  });

  it("getBySslProvider 命中对应的自定义ACME", async () => {
    const service = createService();
    const provider = await service.getBySslProvider("myca2");
    assert.equal(provider?.title, "二号CA");
    assert.equal(provider?.directoryUrl, "https://myca2.example.com/directory");
  });

  it("getBySslProvider 未命中时返回 undefined", async () => {
    const service = createService();
    const provider = await service.getBySslProvider("not-exist");
    assert.equal(provider, undefined);
  });

  it("getBySslProvider 空值直接返回 undefined", async () => {
    const service = createService();
    assert.equal(await service.getBySslProvider(""), undefined);
    assert.equal(await service.getBySslProvider(undefined as any), undefined);
  });

  it("未配置自定义ACME时返回空数组", async () => {
    const service = new CustomAcmeProviderService();
    service.sysSettingsService = {
      async getSetting() {
        return {};
      },
    } as any;
    assert.deepEqual(await service.getAll(), []);
  });
});
