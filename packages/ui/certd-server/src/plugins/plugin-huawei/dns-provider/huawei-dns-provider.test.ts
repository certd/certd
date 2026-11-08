/// <reference types="mocha" />

import assert from "node:assert/strict";
import { ApiRequestOptions } from "@certd/lib-huawei";
import { HuaweiDnsProvider } from "./huawei-dns-provider.js";

function createProvider(responses: any[]) {
  const provider = new HuaweiDnsProvider();
  const calls: ApiRequestOptions[] = [];
  provider.client = {
    async request(req: ApiRequestOptions) {
      calls.push(req);
      assert.ok(responses.length > 0, "没有更多预置响应");
      const response = responses.shift();
      if (response instanceof Error) {
        throw response;
      }
      return response;
    },
  } as any;
  return { provider, calls };
}

describe("HuaweiDnsProvider 解析记录导入", () => {
  it("精确查询公网域名并按页获取解析记录", async () => {
    const { provider, calls } = createProvider([
      { zones: [{ id: "zone-1", name: "example.com." }] },
      {
        metadata: { total_count: 203 },
        recordsets: [
          { id: "record-1", name: "example.com.", type: "A", records: ["192.0.2.1", "192.0.2.2"] },
          { id: "record-2", name: "www.example.com.", type: "CNAME", records: ["target.example.net."] },
          { id: "record-3", name: "*.example.com.", type: "AAAA", records: ["2001:db8::1"] },
        ],
      },
    ]);

    const result = await provider.getRecordListPage("example.com", { pageNo: 2, pageSize: 100 });

    assert.equal(calls.length, 2);
    const zoneUrl = new URL(calls[0].url);
    assert.equal(calls[0].method, "GET");
    assert.equal(zoneUrl.pathname, "/v2/zones");
    assert.equal(zoneUrl.searchParams.get("name"), "example.com.");
    assert.equal(zoneUrl.searchParams.get("search_mode"), "equal");
    assert.equal(zoneUrl.searchParams.get("zone_type"), "public");
    const recordUrl = new URL(calls[1].url);
    assert.equal(calls[1].method, "GET");
    assert.equal(recordUrl.pathname, "/v2/zones/zone-1/recordsets");
    assert.equal(recordUrl.searchParams.get("offset"), "100");
    assert.equal(recordUrl.searchParams.get("limit"), "100");
    assert.deepEqual(result, {
      total: 203,
      list: [
        { id: "record-1", hostRecord: "@", fullRecord: "example.com", type: "A", value: "192.0.2.1,192.0.2.2" },
        { id: "record-2", hostRecord: "www", fullRecord: "www.example.com", type: "CNAME", value: "target.example.net." },
        { id: "record-3", hostRecord: "*", fullRecord: "*.example.com", type: "AAAA", value: "2001:db8::1" },
      ],
    });
  });

  it("兼容带末尾点的子域名区域和不带末尾点的记录", async () => {
    const { provider, calls } = createProvider([{ zones: [{ id: "sub-zone", name: "sub.example.com." }] }, { recordsets: [{ id: "record-1", name: "api.sub.example.com", type: "A", records: ["192.0.2.1"] }] }]);

    const result = await provider.getRecordListPage("sub.example.com.", {});

    assert.equal(new URL(calls[0].url).searchParams.get("name"), "sub.example.com.");
    const recordUrl = new URL(calls[1].url);
    assert.equal(recordUrl.pathname, "/v2/zones/sub-zone/recordsets");
    assert.equal(recordUrl.searchParams.get("offset"), "0");
    assert.equal(recordUrl.searchParams.get("limit"), "50");
    assert.deepEqual(result, {
      total: 1,
      list: [{ id: "record-1", hostRecord: "api", fullRecord: "api.sub.example.com", type: "A", value: "192.0.2.1" }],
    });
  });

  it("空记录页返回空列表并保留总数", async () => {
    const { provider } = createProvider([{ zones: [{ id: "zone-1" }] }, { metadata: { total_count: 100 }, recordsets: [] }]);

    assert.deepEqual(await provider.getRecordListPage("example.com", { pageNo: 2, pageSize: 100 }), { list: [], total: 100 });
  });

  it("兼容未返回记录列表和总数的空响应", async () => {
    const { provider } = createProvider([{ zones: [{ id: "zone-1" }] }, {}]);

    assert.deepEqual(await provider.getRecordListPage("example.com", {}), { list: [], total: 0 });
  });

  it("域名已删除时给出明确错误且不查询解析记录", async () => {
    const { provider, calls } = createProvider([{ zones: [] }]);

    await assert.rejects(() => provider.getRecordListPage("example.com", {}), /未找到华为云公网域名.*example\.com/);
    assert.equal(calls.length, 1);
  });

  for (const stage of ["域名查询", "解析记录查询"]) {
    it(`${stage}失败时保留 API 错误`, async () => {
      const error = new Error("DNS.0001: 权限不足");
      const responses: any[] = [error];
      if (stage === "解析记录查询") {
        responses.unshift({ zones: [{ id: "zone-1" }] });
      }
      const { provider } = createProvider(responses);

      await assert.rejects(() => provider.getRecordListPage("example.com", {}), error);
    });
  }
});
